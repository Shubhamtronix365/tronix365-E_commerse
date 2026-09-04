import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Wrench } from 'lucide-react';

// Preset banner messages designed for Robotics Kits & Electronics store
export const ANNOUNCEMENT_PRESETS = {
  ROBOTICS_KITS: "🤖 ROBOTICS & DIY KITS SPECIAL: High-Torque BO Motors, ESP32 Modules, Sensors & Starter Kits in Stock! Use Code TRONIX10 for 10% OFF ⚡",
  FREE_SHIPPING: "🚚 FREE EXPRESS SHIPPING across India on all Robotics Kits, Arduino & Sensor orders above ₹999! 📦",
  MAINTENANCE: "⚠️ SYSTEM UNDER MAINTENANCE: We are currently upgrading our database and inventory servers. Catalog browsing remains active, but checkout may experience temporary delays. Thank you for your patience! ⚡"
};

export const MaintenanceTicker = ({ activePreset = "MAINTENANCE", customText = null }) => {
  const tickerText = customText || ANNOUNCEMENT_PRESETS[activePreset] || ANNOUNCEMENT_PRESETS.MAINTENANCE;

  return (
    <aside aria-label="Maintenance Announcement" className="w-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-black font-bold border-b border-amber-400/40 shadow-md relative z-50 select-none overflow-hidden">
      <div className="flex items-center h-8 sm:h-9">
        {/* News Headline Badge */}
        <div className="flex items-center gap-1.5 bg-black text-amber-400 px-3 sm:px-4 h-full text-[11px] sm:text-xs font-black uppercase tracking-wider shrink-0 z-10 shadow-lg">
          <AlertTriangle size={14} className="animate-pulse text-amber-400 shrink-0" />
          <span className="hidden xs:inline">NOTICE:</span>
          <span>MAINTENANCE</span>
        </div>

        {/* Rolling News Ticker Marquee */}
        <div className="flex-1 overflow-hidden relative">
          <div className="whitespace-nowrap flex w-max animate-marquee-slow">
            <div className="flex items-center gap-12 pr-12 text-xs sm:text-sm font-semibold tracking-wide">
              <span>{tickerText}</span>
              <span className="text-black/60 font-black">•</span>
              <span>{tickerText}</span>
              <span className="text-black/60 font-black">•</span>
              <span>{tickerText}</span>
              <span className="text-black/60 font-black">•</span>
              <span>{tickerText}</span>
              <span className="text-black/60 font-black">•</span>
            </div>
            <div className="flex items-center gap-12 pr-12 text-xs sm:text-sm font-semibold tracking-wide" aria-hidden="true">
              <span>{tickerText}</span>
              <span className="text-black/60 font-black">•</span>
              <span>{tickerText}</span>
              <span className="text-black/60 font-black">•</span>
              <span>{tickerText}</span>
              <span className="text-black/60 font-black">•</span>
              <span>{tickerText}</span>
              <span className="text-black/60 font-black">•</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export const MaintenanceModal = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-tronix-dark/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-md bg-tronix-card/65 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-amber-500/5 overflow-hidden z-10"
          >
            {/* Visual Glassmorphism highlight */}
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-tronix-primary/10 blur-3xl pointer-events-none" />

            <div className="flex flex-col items-center text-center">
              {/* Animated Icon Container */}
              <motion.div
                animate={{ rotate: [0, 5, -5, 5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-lg shadow-amber-500/10"
              >
                <Wrench className="w-8 h-8 animate-pulse" />
              </motion.div>

              {/* Title */}
              <h3 className="text-xl md:text-2xl font-display font-extrabold text-white mb-3 tracking-wide flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                SYSTEM UNDER MAINTENANCE
              </h3>

              {/* Description */}
              <p className="text-tronix-muted text-sm md:text-base leading-relaxed mb-8">
                We are currently performing scheduled backend database optimizations to enhance server response times and secure checkout. 
                <br /><br />
                You can continue browsing, but some catalog items or checkout operations may be temporarily limited.
              </p>

              {/* Close Button */}
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(139, 92, 246, 0.4)" }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-tronix-primary to-violet-600 text-white font-bold tracking-wider hover:opacity-95 transition-all shadow-lg shadow-tronix-primary/25 cursor-pointer text-sm font-display uppercase"
              >
                Understood / OK
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
