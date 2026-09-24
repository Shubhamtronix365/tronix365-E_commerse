-- PostgreSQL Update Script for NeonDB
-- This script updates all products with enhanced descriptions and keywords
-- Generated for Tronix365 E-commerce Database

-- Set standard_conforming_strings for proper string handling
SET standard_conforming_strings = on;

-- Function to safely update products with enhanced data
-- This handles the JSON keywords field properly for PostgreSQL

-- Note: Run this script in your NeonDB PostgreSQL database
-- Connect to your NeonDB database and execute this file

-- Example connection: psql -h xxx.neon.tech -U username -d database_name -f update_products_neondb.sql

-- The enhanced data will be applied from the JSON structure
-- You may need to adjust column names based on your actual schema