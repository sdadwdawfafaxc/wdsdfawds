from flask import Flask, request, jsonify, send_from_directory, render_template
from werkzeug.utils import secure_filename
import os


import yt_dlp
import subprocess
import requests
import re

app = Flask(__name__)

# Use absolute path for downloads folder
DOWNLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

# Add FFmpeg to system PATH if it's not already there
ffmpeg_path = "C:\\Program Files\\ffmpeg\\bin"
if ffmpeg_path not in os.environ["PATH"]:

    
    os.environ["PATH"] += os.pathsep + ffmpeg_path

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/download", methods=["POST"])
def download():
    data = request.get_json()
    url = data.get("url")
    fmt = data.get("format")
    try:
        # TikTok Photo (ถ้าเลือก mp3 จะพยายามดึงเสียงเพลงแทน)
        if re.search(r"tiktok\.com/.*/photo/", url):
            if fmt == "mp3":
                # ใช้ yt-dlp ดึง audio จาก TikTok Photo (ถ้ามี)
                try:
                    ydl_opts = {
                        "format": "bestaudio/best",
                        "outtmpl": os.path.join(DOWNLOAD_FOLDER, "tiktok_photo_%(id)s.%(ext)s"),
                        "noplaylist": True,
                    }
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(url, download=True)
                        audio_path = ydl.prepare_filename(info)
                        # แปลงเป็น mp3 ถ้ายังไม่ใช่ mp3
                        mp3_path = os.path.splitext(audio_path)[0] + ".mp3"
                        mp3_basename = secure_filename(os.path.basename(mp3_path))
                        safe_mp3_path = os.path.join(DOWNLOAD_FOLDER, mp3_basename)
                        ffmpeg_exe = os.path.join(ffmpeg_path, "ffmpeg.exe") if ffmpeg_path else "ffmpeg"
                        if not os.path.isfile(ffmpeg_exe):
                            ffmpeg_exe = "ffmpeg"
                        try:
                            subprocess.run([
                                ffmpeg_exe,
                                "-y",
                                "-i", audio_path,
                                "-vn",
                                "-ab", "192k",
                                "-ar", "44100",
                                "-f", "mp3",
                                safe_mp3_path
                            ], check=True)
                            return jsonify(success=True, file=f"/downloads/{mp3_basename}")
                        except Exception as ffmpeg_err:
                            return jsonify(success=False, error=f"FFmpeg error: {ffmpeg_exe} : {ffmpeg_err}\nกรุณาตรวจสอบว่า ffmpeg.exe อยู่ใน PATH หรือระบุ path ffmpeg ให้ถูกต้องในโค้ด!")
                except Exception as audio_err:
                    return jsonify(success=False, error=f"ไม่พบเสียงเพลงในโพสต์นี้ หรือไม่สามารถดาวน์โหลดเสียงได้: {audio_err}")
            else:
                return jsonify(success=False, error="โพสต์นี้เป็นภาพ ไม่รองรับการดาวน์โหลดเป็นวิดีโอหรือไฟล์อื่นนอกจาก MP3")

        # วิดีโอหรือเพลง
        ydl_opts = {
            "format": "bestvideo+bestaudio/best",
            "outtmpl": os.path.join(DOWNLOAD_FOLDER, "%(title)s.%(ext)s"),
            "noplaylist": True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            video_path = ydl.prepare_filename(info)
            video_basename = secure_filename(os.path.basename(video_path))
            safe_video_path = os.path.join(DOWNLOAD_FOLDER, video_basename)
            if video_path != safe_video_path:
                os.rename(video_path, safe_video_path)
                video_path = safe_video_path

        if fmt == "mp3":
            mp3_path = os.path.splitext(video_path)[0] + ".mp3"
            mp3_basename = secure_filename(os.path.basename(mp3_path))
            safe_mp3_path = os.path.join(DOWNLOAD_FOLDER, mp3_basename)
            ffmpeg_exe = os.path.join(ffmpeg_path, "ffmpeg.exe") if ffmpeg_path else "ffmpeg"
            if not os.path.isfile(ffmpeg_exe):
                ffmpeg_exe = "ffmpeg"  # fallback to PATH
            try:
                subprocess.run([
                    ffmpeg_exe,
                    "-y",
                    "-i", video_path,
                    "-vn",
                    "-ab", "192k",
                    "-ar", "44100",
                    "-f", "mp3",
                    safe_mp3_path
                ], check=True)
                return jsonify(success=True, file=f"/downloads/{mp3_basename}")
            except Exception as ffmpeg_err:
                return jsonify(success=False, error=f"FFmpeg error: {ffmpeg_exe} : {ffmpeg_err}\nกรุณาตรวจสอบว่า ffmpeg.exe อยู่ใน PATH หรือระบุ path ffmpeg ให้ถูกต้องในโค้ด!")
        else:
            return jsonify(success=True, file=f"/downloads/{video_basename}")
    except Exception as e:
        return jsonify(success=False, error=str(e))

@app.route("/downloads/<path:filename>")
def serve_file(filename):
    return send_from_directory(DOWNLOAD_FOLDER, filename, as_attachment=True)

if __name__ == "__main__":
    app.run(debug=True)
