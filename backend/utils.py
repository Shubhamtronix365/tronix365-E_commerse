from PIL import Image
import os
import re
import bleach


def sanitize_html(text: str) -> str:
    """Strip all HTML tags from the input string."""
    if not text:
        return text
    return bleach.clean(text, tags=[], attributes={}, strip=True)


def sanitize_description(text: str) -> str:
    """Allow a safe subset of HTML tags for descriptions."""
    if not text:
        return text
    allowed_tags = ["p", "b", "i", "u", "em", "strong", "ul", "ol", "li", "br"]
    return bleach.clean(text, tags=allowed_tags, attributes={}, strip=True)


def sanitize_blog_html(text: str) -> str:
    """
    Allow safe rich formatting for blog posts while strictly stripping
    malicious scripts, iframes, and javascript event handlers.
    """
    if not text:
        return text
    # Strip <script>...</script> and <style>...</style> content completely
    clean_text = re.sub(r"<(script|style)[^>]*>[\s\S]*?</\1>", "", text, flags=re.IGNORECASE)
    allowed_tags = [
        "h1", "h2", "h3", "h4", "h5", "h6",
        "p", "b", "i", "u", "em", "strong", "span", "div",
        "ul", "ol", "li", "blockquote", "code", "pre",
        "hr", "br", "a", "img",
        "table", "thead", "tbody", "tr", "th", "td",
    ]
    allowed_attributes = {
        "a": ["href", "title", "target", "rel"],
        "img": ["src", "alt", "title", "width", "height", "class"],
        "*": ["class", "id"],
    }
    return bleach.clean(clean_text, tags=allowed_tags, attributes=allowed_attributes, strip=True)



def process_image(file_path: str) -> str:
    """
    Optimize image:
    1. Convert to WebP format.
    2. Resize if too large.
    3. Return the new file path.
    """
    try:
        with Image.open(file_path) as img:
            # Convert to RGB if it's RGBA or P
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            # Resize if width > 1200px
            if img.width > 1200:
                target_width = 1200
                target_height = int(img.height * (target_width / img.width))
                img = img.resize(
                    (target_width, target_height), Image.Resampling.LANCZOS
                )

            # Generate WebP path
            base_name = os.path.splitext(file_path)[0]
            webp_path = base_name + ".webp"

            # Save as WebP
            img.save(webp_path, "WEBP", quality=80)

            # Optionally delete original if it's not webp
            if not file_path.endswith(".webp"):
                try:
                    os.remove(file_path)
                except:
                    pass

            return webp_path
    except Exception as e:
        print(f"Error optimizing image {file_path}: {e}")
        return file_path  # Return original if optimization fails
