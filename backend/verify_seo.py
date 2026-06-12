import os
import re
import xml.etree.ElementTree as ET

# Base paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
SRC_DIR = os.path.join(BASE_DIR, "src")
PAGES_DIR = os.path.join(SRC_DIR, "pages")

print("=========================================")
print("  TRONIX365 SEO & RANKING VALIDATION TEST  ")
print("=========================================\n")

errors = []
warnings = []
passed = []

# 1. Test robots.txt
print("--- 1. Testing robots.txt ---")
robots_path = os.path.join(PUBLIC_DIR, "robots.txt")
if not os.path.exists(robots_path):
    errors.append("robots.txt is missing in the public directory.")
    print("[FAIL] robots.txt not found.")
else:
    with open(robots_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Check for basic rules
    if "User-agent: *" not in content:
        errors.append("robots.txt does not define rules for all User-agents ('User-agent: *').")
    
    # Check for sitemap URLs
    sitemaps = re.findall(r"Sitemap:\s*(https?://\S+)", content)
    if not sitemaps:
        errors.append("robots.txt is missing a Sitemap directive.")
    else:
        print(f"[INFO] Found sitemaps in robots.txt: {sitemaps}")
        for sm in sitemaps:
            if "sitemap.xml" not in sm:
                warnings.append(f"Sitemap URL in robots.txt doesn't seem to point to sitemap.xml: {sm}")

    # Check for Disallow / Allow rules
    if "Disallow: /e-commerse/cart" not in content:
        warnings.append("robots.txt should disallow crawl on cart pages to save crawl budget.")
    if "Disallow: /e-commerse/checkout" not in content:
        warnings.append("robots.txt should disallow crawl on checkout page.")
    if "Disallow: /e-commerse/admin" not in content:
        warnings.append("robots.txt should disallow crawl on admin dashboards.")
        
    print("[PASS] robots.txt exists and basic structure is correct.")
    passed.append("robots.txt exists and is configured.")

# 2. Test sitemap.xml
print("\n--- 2. Testing sitemap.xml ---")
sitemap_path = os.path.join(PUBLIC_DIR, "sitemap.xml")
if not os.path.exists(sitemap_path):
    errors.append("sitemap.xml is missing in the public directory.")
    print("[FAIL] sitemap.xml not found.")
else:
    try:
        tree = ET.parse(sitemap_path)
        root = tree.getroot()
        
        # Check namespaces
        namespace = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
        urls = root.findall(f"{namespace}url")
        
        print(f"[INFO] Total URLs in sitemap.xml: {len(urls)}")
        if len(urls) == 0:
            errors.append("sitemap.xml contains 0 URLs.")
        else:
            invalid_domain_urls = []
            for url_node in urls:
                loc = url_node.find(f"{namespace}loc")
                if loc is not None and loc.text:
                    if not loc.text.startswith("https://www.tronix365.in/e-commerse"):
                        invalid_domain_urls.append(loc.text)
            
            if invalid_domain_urls:
                warnings.append(f"Found {len(invalid_domain_urls)} URLs with non-production base domains in sitemap.xml. Example: {invalid_domain_urls[0]}")
            
            print("[PASS] sitemap.xml is valid XML and contains URLs.")
            passed.append(f"sitemap.xml is valid and contains {len(urls)} URLs.")
    except ET.ParseError as e:
        errors.append(f"sitemap.xml has invalid XML format: {e}")
        print("[FAIL] sitemap.xml failed XML parsing.")

# 3. Test React Pages client-side SEO implementation
print("\n--- 3. Testing React Pages SEO ---")
if not os.path.exists(PAGES_DIR):
    errors.append("React pages directory does not exist.")
    print("[FAIL] pages directory not found.")
else:
    pages_to_check = {
        "Home.jsx": "Home Page",
        "Shop.jsx": "Shop / Listing Page",
        "ProductDetails.jsx": "Product Details Page",
        "Categories.jsx": "Categories List Page",
        "InfoPages.jsx": "Info Pages (About, Contact, Terms, Privacy)"
    }
    
    for filename, page_name in pages_to_check.items():
        file_path = os.path.join(PAGES_DIR, filename)
        if not os.path.exists(file_path):
            warnings.append(f"React page {filename} ({page_name}) is missing entirely.")
            continue
            
        with open(file_path, "r", encoding="utf-8") as f:
            code = f.read()
            
        has_seo_import = "import SEO from" in code or "import SEO " in code
        has_seo_tag = "<SEO" in code
        
        if filename == "InfoPages.jsx":
            # InfoPages has multiple sub-components, let's see where SEO is placed
            # Layout might have SEO, or subcomponents might
            if has_seo_tag:
                print(f"[PASS] {filename} ({page_name}) uses the <SEO> component.")
            else:
                warnings.append(f"{filename} ({page_name}) does NOT use the <SEO> component.")
        else:
            if has_seo_import and has_seo_tag:
                print(f"[PASS] {filename} ({page_name}) correctly imports and uses <SEO>.")
                passed.append(f"{filename} has client-side SEO.")
            else:
                warnings.append(f"{filename} ({page_name}) is MISSING client-side SEO setup (no <SEO> component).")

# 4. Test public/index.php crawler interception logic
print("\n--- 4. Testing public/index.php ---")
index_php_path = os.path.join(PUBLIC_DIR, "index.php")
if not os.path.exists(index_php_path):
    warnings.append("index.php is missing in the public directory (critical for search engines if hosting on PHP-based host).")
    print("[WARN] index.php not found.")
else:
    with open(index_php_path, "r", encoding="utf-8") as f:
        php_code = f.read()
        
    # Check if index.php handles specific crawler routes
    routes_checked = {
        "product/": "product/.* (Product Page)",
        "category/": "category/.* (Category Page)",
        "shop": "shop (Shop Page)",
        "about": "about (About Page)",
        "contact": "contact (Contact Page)",
        "terms": "terms (Terms Page)",
        "privacy": "privacy (Privacy Policy Page)",
        "categories": "categories (Categories Page)"
    }
    
    for route_key, route_desc in routes_checked.items():
        # Match routes checked in regex or condition (unescaped or escaped slashes)
        escaped_route_key = route_key.replace("/", "\\/")
        if route_key in php_code or escaped_route_key in php_code:
            print(f"[PASS] index.php crawler agent handles route: {route_desc}")
            passed.append(f"index.php crawler agent handles route: {route_key}")
        else:
            warnings.append(f"index.php does NOT handle crawler route: {route_desc}")

# 5. Check AI SEO description writer
print("\n--- 5. Checking AI Description Generator ---")
gen_desc_path = os.path.join(BASE_DIR, "backend", "generate_descriptions.py")
if os.path.exists(gen_desc_path):
    print("[PASS] AI SEO Description Generator exists in backend/generate_descriptions.py.")
    passed.append("AI SEO Description Generator is available.")
else:
    warnings.append("backend/generate_descriptions.py is missing (used for generating AI SEO product descriptions).")

# Final summary
print("\n=========================================")
print("             TEST SUMMARY                ")
print("=========================================")
print(f"Passed Checks:   {len(passed)}")
print(f"Warnings/Gaps:   {len(warnings)}")
print(f"Critical Errors: {len(errors)}")
print("=========================================")

if errors:
    print("\nCritical Errors to fix:")
    for err in errors:
        print(f" - [ERROR] {err}")
        
if warnings:
    print("\nWarnings / Remaining Items:")
    for warn in warnings:
        print(f" - [WARN] {warn}")

if not errors and not warnings:
    print("\nEverything is perfectly implemented and tested! [SUCCESS]")
