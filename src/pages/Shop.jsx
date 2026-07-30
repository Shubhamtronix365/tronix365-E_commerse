import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X } from 'lucide-react';
import ProductCard from '../components/product/ProductCard';
import ProductCardSkeleton from '../components/product/ProductCardSkeleton';
import ProductFilter from '../components/shop/ProductFilter';
import client from '../api/client';
import SEO from '../components/common/SEO';
import { useCategories } from '../hooks/useCategories';

const categorySeoData = {
    'all': {
        title: 'Shop Electronic Components & Microcontrollers',
        description: 'Explore the full catalog of electronic parts, development boards, sensors, and robotics components at Tronix365.',
        faqs: [
            { q: "What is Tronix365?", a: "Tronix365 is an e-commerce platform offering electronic components, microcontroller boards, sensors, and DIY tools for electronics creators." },
            { q: "Do you ship across India?", a: "Yes, we ship to all major cities and states across India with fast courier services." }
        ]
    },
    'sensors': {
        title: 'Electronic Sensors - Ultrasonic, Temperature, IR Sensors',
        description: 'Shop high-quality ultrasonic, temperature, humidity, IR, and obstacle sensors for your microcontrollers. Best prices in India with fast delivery.',
        faqs: [
            { q: "What are sensors in electronics?", a: "Sensors are devices that detect changes in the physical environment (like temperature, distance, light, motion) and convert them into electrical signals that microcontrollers like Arduino can read." },
            { q: "Can I use these sensors with ESP32 or Raspberry Pi?", a: "Yes, most sensors are compatible with Arduino, ESP32, ESP8266, and Raspberry Pi operating at 3.3V or 5V." }
        ]
    },
    'development-boards': {
        title: 'Microcontroller & Development Boards - Arduino, Raspberry Pi',
        description: 'Get authentic Arduino Uno, Raspberry Pi, and other microcontroller development boards. Perfect for students, developers, and electronics hobbyists.',
        faqs: [
            { q: "What is the difference between Arduino and Raspberry Pi?", a: "Arduino is a microcontroller board designed for executing simple code and interacting with sensors directly. Raspberry Pi is a full single-board computer running an OS, suitable for heavy computations and IoT projects." },
            { q: "Do the boards come with usb cables?", a: "Most of our Arduino boards come with a compatible USB programming cable included." }
        ]
    },
    'modules': {
        title: 'Electronic Modules & IoT Boards - WiFi, Bluetooth, Relay',
        description: 'Buy high-performance ESP32 development boards, NodeMCU ESP8266, and WiFi modules for IoT and smart home projects at Tronix365.',
        faqs: [
            { q: "Does the ESP32 board support Bluetooth and WiFi?", a: "Yes, ESP32 has integrated Wi-Fi and Bluetooth capabilities, making it ideal for remote monitoring and IoT applications." },
            { q: "What is a relay module?", a: "A relay module is an electrically operated switch that allows microcontrollers to control high-voltage appliances like bulbs or fans safely." }
        ]
    },
    'motors': {
        title: 'Robotics Parts & Motors - Servos, Gear Motors, Steppers',
        description: 'Explore robotics components, SG90 servo motor, DC gear motor, and accessories. Build your next robotic arm or rover with Tronix365.',
        faqs: [
            { q: "What is an SG90 servo motor?", a: "The SG90 is a lightweight micro-servo motor that rotates 180 degrees, commonly used in small RC planes, robotics, and servo control projects." },
            { q: "Can I drive DC motors directly from Arduino?", a: "No, DC motors require more current than Arduino pins can provide. You should use a motor driver IC (like L293D) or transistor switch." }
        ]
    },
    'battery': {
        title: 'Li-Po & Lithium-Ion Rechargeable Batteries',
        description: 'High capacity, safe lithium polymer (Li-Po) and lithium-ion batteries. Lightweight power solutions for drones, RC planes, and portable devices.',
        faqs: [
            { q: "How do I safely charge Li-Po batteries?", a: "Always use a dedicated Li-Po balance charger and never leave batteries charging unattended. Keep them in a fireproof bag." }
        ]
    },
    'displays': {
        title: 'IoT Display Modules - OLED, LCD, I2C Displays',
        description: 'Discover essential electronics modules including OLED displays, I2C screens, and relay control boards. Easy interface with your smart projects.',
        faqs: [
            { q: "How do I interface an OLED display with Arduino?", a: "Most OLED modules use the I2C interface (SDA/SCL pins) and can be programmed using libraries like Adafruit SSD1306 in the Arduino IDE." }
        ]
    },
    'miscellaneous': {
        title: 'Miscellaneous Electronic Components & Accessories',
        description: "Browse our curated miscellaneous range of electronic components, accessories, and add-ons that don't fit a single category — perfect for makers and tinkerers.",
        faqs: [
            { q: "What types of products are in Miscellaneous?", a: "Miscellaneous includes a wide range of electronic accessories, prototyping tools, breakout boards, and specialty components that span multiple categories." }
        ]
    },
    'other': {
        title: 'Other Products & Electronic Parts',
        description: 'Explore other electronic products and parts at Tronix365 — unique components not fitting standard categories, great for custom builds and research projects.',
        faqs: [
            { q: "What is in the Other category?", a: "The Other category covers unique or specialty products that fall outside our standard catalog — including limited editions, import items, and experimental components." }
        ]
    }
};

const Shop = () => {
    const { category } = useParams();
    const { categories: dbCategories } = useCategories();
    const categoryNames = dbCategories ? dbCategories.filter(c => c.is_active !== false).map(c => c.name) : [];

    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(() => {
        return sessionStorage.getItem('shop_category') || 'All';
    });

    // Initialize category from URL if present
    useEffect(() => {
        if (category) {
            // Match against dynamic category names
            const targetCategory = categoryNames.find(c =>
                c.toLowerCase().replace(/\s+/g, '-') === category.toLowerCase()
            );

            if (targetCategory) {
                setSelectedCategory(targetCategory);
            } else {
                if (category.toLowerCase() === 'all') {
                    setSelectedCategory('All');
                }
            }
        } else {
            const savedCategory = sessionStorage.getItem('shop_category');
            if (savedCategory) {
                setSelectedCategory(savedCategory);
            } else {
                setSelectedCategory('All');
            }
        }
    }, [category, categoryNames]);

    const [priceRange, setPriceRange] = useState(() => {
        const storedPrice = sessionStorage.getItem('shop_priceRange');
        return storedPrice ? Number(storedPrice) : 10000;
    });
    const [sortBy, setSortBy] = useState(() => {
        return sessionStorage.getItem('shop_sortBy') || '';
    });
    const [showInStockOnly, setShowInStockOnly] = useState(() => {
        return sessionStorage.getItem('shop_showInStockOnly') === 'true';
    });

    // Save filters to sessionStorage when they change
    useEffect(() => {
        sessionStorage.setItem('shop_category', selectedCategory);
    }, [selectedCategory]);

    useEffect(() => {
        sessionStorage.setItem('shop_priceRange', priceRange.toString());
    }, [priceRange]);

    useEffect(() => {
        sessionStorage.setItem('shop_sortBy', sortBy);
    }, [sortBy]);

    useEffect(() => {
        sessionStorage.setItem('shop_showInStockOnly', showInStockOnly.toString());
    }, [showInStockOnly]);

    // Pagination State
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const LIMIT = 12;

    const [error, setError] = useState(null);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

    // Initial Load & Filter Change
    useEffect(() => {
        fetchProducts(1, true);
    }, [selectedCategory, priceRange, sortBy, showInStockOnly, window.location.search]);

    const fetchProducts = async (pageToFetch, reset = false) => {
        if (reset) {
            setLoading(true);
            setPage(1);
            setHasMore(true);
        } else {
            setLoadingMore(true);
        }
        setError(null);

        try {
            const params = {
                skip: (pageToFetch - 1) * LIMIT,
                limit: LIMIT
            };

            // Add Filters
            const searchParams = new URLSearchParams(window.location.search);
            const searchQuery = searchParams.get('search');

            if (selectedCategory !== 'All') params.category = selectedCategory;
            if (priceRange < 10000) params.max_price = priceRange;
            if (sortBy) params.sort_by = sortBy;
            if (searchQuery) params.search = searchQuery;

            const response = await client.get('/products', { params });
            let data = response.data;

            // Client-side Stock Filter (Ideally this should be backend too, but keeping for consistency)
            if (showInStockOnly) {
                data = data.filter(p => p.stock > 0);
            }

            if (data.length < LIMIT) {
                setHasMore(false);
            }

            if (reset) {
                setProducts(data);
                setFilteredProducts(data); // Keeping filteredProducts for compatibility if needed, but distinct mainly for client-side search which we replaced
            } else {
                setProducts(prev => [...prev, ...data]);
                setFilteredProducts(prev => [...prev, ...data]);
            }
        } catch (err) {
            console.error(err);
            setError("Failed to load products.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchProducts(nextPage, false);
    };

    const categoryKey = category ? category.toLowerCase() : 'all';
    const activeSeo = categorySeoData[categoryKey] || categorySeoData['all'];

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <SEO
                title={activeSeo.title}
                description={activeSeo.description}
                url={`https://www.tronix365.in/e-commerse/category/${categoryKey}`}
            />
            {activeSeo.faqs && activeSeo.faqs.length > 0 && (
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "FAQPage",
                        "mainEntity": activeSeo.faqs.map(faq => ({
                            "@type": "Question",
                            "name": faq.q,
                            "acceptedAnswer": {
                                "@type": "Answer",
                                "text": faq.a
                            }
                        }))
                    })}
                </script>
            )}
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                            {new URLSearchParams(window.location.search).get('search') ? `Search Results: "${new URLSearchParams(window.location.search).get('search')}"` : 'Shop Components'}
                        </h1>
                        <p className="text-gray-400">Browse our collection of premium electronics.</p>
                    </div>

                    <button
                        onClick={() => setIsMobileFilterOpen(true)}
                        className="md:hidden flex items-center gap-2 bg-tronix-card border border-white/10 px-4 py-2 rounded-lg text-white font-medium hover:bg-white/5 transition-colors"
                    >
                        <Filter size={18} /> Filters
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Desktop Sidebar */}
                    <div className="hidden lg:block lg:col-span-1">
                        <ProductFilter
                            categories={categoryNames}
                            selectedCategory={selectedCategory}
                            setSelectedCategory={setSelectedCategory}
                            priceRange={priceRange}
                            setPriceRange={setPriceRange}
                            sortBy={sortBy}
                            setSortBy={setSortBy}
                            showInStockOnly={showInStockOnly}
                            setShowInStockOnly={setShowInStockOnly}
                        />
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-3">
                        {/* Loading State */}
                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[...Array(6)].map((_, i) => (
                                    <ProductCardSkeleton key={i} />
                                ))}
                            </div>
                        ) : error ? (
                            <div className="text-center text-red-500 py-10">{error}</div>
                        ) : filteredProducts.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredProducts.map((product) => (
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </div>
                                {hasMore && (
                                    <div className="mt-12 flex justify-center">
                                        <button
                                            onClick={handleLoadMore}
                                            disabled={loadingMore}
                                            className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-white font-semibold hover:bg-white/10 transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {loadingMore ? 'Loading...' : 'Load More'}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                <Filter size={48} className="mb-4 opacity-50" />
                                <h3 className="text-xl font-bold mb-2">No products found</h3>
                                <p>Try adjusting your search or filters.</p>
                                <button
                                    onClick={() => { setSelectedCategory('All'); setPriceRange(10000); setSortBy(''); setShowInStockOnly(false); }}
                                    className="mt-4 text-tronix-primary hover:underline"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* SEO FAQ Section */}
                {activeSeo.faqs && activeSeo.faqs.length > 0 && (
                    <div className="mt-16 bg-tronix-card/30 border border-white/5 rounded-2xl p-8 backdrop-blur-md">
                        <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-6">
                            Frequently Asked Questions
                        </h2>
                        <div className="space-y-6">
                            {activeSeo.faqs.map((faq, idx) => (
                                <div key={idx} className="border-b border-white/10 pb-4 last:border-b-0 last:pb-0">
                                    <h3 className="text-lg font-bold text-tronix-primary mb-2">
                                        {faq.q}
                                    </h3>
                                    <p className="text-gray-300 leading-relaxed text-sm">
                                        {faq.a}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mobile Filter Drawer */}
                <AnimatePresence>
                    {isMobileFilterOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMobileFilterOpen(false)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
                            />
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="fixed inset-y-0 right-0 w-80 bg-tronix-bg border-l border-white/10 z-50 lg:hidden p-6 overflow-y-auto"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="font-display font-bold text-xl text-white">Filters</h3>
                                    <button onClick={() => setIsMobileFilterOpen(false)} className="text-gray-400 hover:text-white">
                                        <X size={24} />
                                    </button>
                                </div>
                                <ProductFilter
                                    categories={categoryNames}
                                    selectedCategory={selectedCategory}
                                    setSelectedCategory={setSelectedCategory}
                                    priceRange={priceRange}
                                    setPriceRange={setPriceRange}
                                    sortBy={sortBy}
                                    setSortBy={setSortBy}
                                    showInStockOnly={showInStockOnly}
                                    setShowInStockOnly={setShowInStockOnly}
                                    isMobile={true}
                                />
                                <button
                                    onClick={() => setIsMobileFilterOpen(false)}
                                    className="w-full mt-8 bg-tronix-primary text-white font-bold py-3 rounded-xl hover:bg-violet-600 transition-colors"
                                >
                                    Show Results
                                </button>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Shop;
