import os
import subprocess
import imageio_ffmpeg

# Paths
assets_dir = r"c:\Users\Hi\Desktop\tronix365-E_commerse\src\assets"
input_video = os.path.join(assets_dir, "Tronix1 .mp4")

output_preview = os.path.join(assets_dir, "Tronix1_preview.png")
output_mp4 = os.path.join(assets_dir, "Tronix1_optimized.mp4")
output_webm = os.path.join(assets_dir, "Tronix1_optimized.webm")

def run_ffmpeg(args):
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [ffmpeg_exe] + args
    print(f"Running command: {' '.join(cmd)}")
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        print(f"Error executing command: {result.stderr}")
        return False
    return True

def main():
    if not os.path.exists(input_video):
        print(f"Input video not found: {input_video}")
        return

    print("Step 1: Extracting preview/poster frame...")
    # Extract first frame as a preview PNG
    # Use -vf "scale=iw:ih" to match resolution, -vframes 1 for one frame
    preview_args = ["-y", "-i", input_video, "-ss", "00:00:00.000", "-vframes", "1", output_preview]
    if run_ffmpeg(preview_args):
        print(f"Preview frame extracted successfully to {output_preview}")
    else:
        print("Failed to extract preview frame.")

    print("\nStep 2: Compressing and optimizing MP4 (H.264, no audio, mobile compatible)...")
    # -an: remove audio
    # -vcodec libx264: H.264 video codec
    # -crf 26: Constant Rate Factor (balanced file size and visual quality)
    # -preset slow: better compression ratio
    # -pix_fmt yuv420p: Pixel format highly compatible with iOS and old mobile devices
    mp4_args = [
        "-y",
        "-i", input_video,
        "-an",
        "-vcodec", "libx264",
        "-crf", "26",
        "-preset", "slow",
        "-pix_fmt", "yuv420p",
        output_mp4
    ]
    if run_ffmpeg(mp4_args):
        print(f"Optimized MP4 created successfully: {output_mp4}")
        old_size = os.path.getsize(input_video)
        new_size = os.path.getsize(output_mp4)
        print(f"Size reduced from {old_size/(1024*1024):.2f}MB to {new_size/(1024*1024):.2f}MB ({((old_size-new_size)/old_size)*100:.1f}% reduction)")
    else:
        print("Failed to create optimized MP4.")

    print("\nStep 3: Compressing and optimizing WebM (VP9, no audio, next-gen mobile compatible)...")
    # -an: remove audio
    # -vcodec libvpx-vp9: VP9 video codec (supported by all modern browsers, highly optimized)
    # -crf 35: Constant Rate Factor for VP9 (VP9 scale goes up to 63, 35 is good visual quality/bitrate ratio)
    # -b:v 800k: limit bitrate to 800 kbps for fast mobile downloads
    webm_args = [
        "-y",
        "-i", input_video,
        "-an",
        "-vcodec", "libvpx-vp9",
        "-crf", "35",
        "-b:v", "800k",
        output_webm
    ]
    if run_ffmpeg(webm_args):
        print(f"Optimized WebM created successfully: {output_webm}")
        new_webm_size = os.path.getsize(output_webm)
        print(f"WebM size: {new_webm_size/(1024*1024):.2f}MB ({((old_size-new_webm_size)/old_size)*100:.1f}% reduction compared to original)")
    else:
        print("Failed to create optimized WebM.")

if __name__ == "__main__":
    main()
