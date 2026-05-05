import os
from utils import process_image
from PIL import Image

def test_image_optimization():
    print("Testing Image Optimization...")
    # Create a dummy large image
    test_img_path = "test_large.png"
    img = Image.new('RGB', (1500, 1000), color = 'red')
    img.save(test_img_path)
    
    # Process it
    optimized_path = process_image(test_img_path)
    print(f"Optimized path: {optimized_path}")
    
    assert optimized_path.endswith(".webp")
    assert os.path.exists(optimized_path)
    
    with Image.open(optimized_path) as opt_img:
        print(f"Optimized size: {opt_img.size}")
        assert opt_img.width <= 1200
        assert opt_img.format == "WEBP"
    
    # Clean up
    if os.path.exists(test_img_path): os.remove(test_img_path)
    if os.path.exists(optimized_path): os.remove(optimized_path)
    print("Image optimization test passed!")

if __name__ == "__main__":
    try:
        test_image_optimization()
        print("\nPerformance unit tests passed!")
    except Exception as e:
        print(f"\nTests failed: {e}")
        import traceback
        traceback.print_exc()
