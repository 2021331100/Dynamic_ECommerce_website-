import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const HeroSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      title: "Premium Electronics",
      subtitle: "Discover the latest tech innovations",
      description:
        "Up to 50% off on premium headphones, smartwatches, and more",
      image: "./Electronics.jpg",
      cta: "Shop Electronics",
      url: "/products?category=Electronics",
    },
    {
      id: 2,
      title: "Fashion Forward",
      subtitle: "Style meets comfort",
      description: "New arrivals in designer clothing and accessories",
      image: "./fashions.jpg",
      cta: "Explore Fashion",
      url: "/products?category=Fashion",
    },
    {
      id: 3,
      title: "Home & Garden",
      subtitle: "Transform your space",
      description: "Beautiful furniture and decor for every home",
      image: "./home.jpg",
      cta: "Shop Home",
      url: `/products?category=Home & Garden`,
    },
    {
      id: 4,
      title: "Sports & Fitness",
      subtitle: "Gear up for every workout",
      description: "Performance apparel, smart trackers, and gym essentials",
      image: "./sports.jpg",
      cta: "Shop Sports",
      url: "/products?category=Sports",
    },
    {
      id: 5,
      title: "Book Haven",
      subtitle: "Stories for every shelf",
      description: "Bestsellers, classics, and inspiring non-fiction picks",
      image: "./book.jpg",
      cta: "Browse Books",
      url: "/products?category=Books",
    },
    {
      id: 6,
      title: "Beauty & Glow",
      subtitle: "Self-care starts here",
      description: "Skincare, makeup, and grooming sets curated for you",
      image: "./beauty.jpg",
      cta: "Shop Beauty",
      url: "/products?category=Beauty",
    },
    {
      id: 7,
      title: "Auto Essentials",
      subtitle: "Drive with confidence",
      description: "Detailing kits, smart accessories, and travel gear",
      image: "./automotive.jpg",
      cta: "Shop Automotive",
      url: "/products?category=Automotive",
    },
    {
      id: 8,
      title: "Kids & Baby",
      subtitle: "Joyful finds for little ones",
      description: "Toys, apparel, and nursery must-haves parents love",
      image: "./kids.jpg",
      cta: "Shop Kids",
      url: "/products?category=Kids & Baby",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 1900);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const slide = slides[currentSlide];

  return (
    <div className="relative h-[70vh] overflow-hidden rounded-2xl">
      {/* Single Active Slide */}
      <div className="relative h-full">
        <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
          style={{ backgroundImage: `url(${slide.image})` }}
        />
        <div className="absolute inset-0" />
        <div className="relative h-full flex items-center justify-center text-center px-6">
          <div className="max-w-3xl animate-fade-in-up">
            <h3 className="text-lg font-medium text-foreground mb-2">
              {slide.subtitle}
            </h3>
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-4">
              {slide.title}
            </h1>
            <p className="text-xl text-foreground font-bold mb-8 max-w-2xl mx-auto">
              {slide.description}
            </p>
            <Link
              to={slide.url}
              className="px-8 py-4 gradient-primary text-primary-foreground rounded-lg hover:glow-on-hover animate-smooth font-semibold text-lg"
            >
              {slide.cta}
            </Link>
          </div>
        </div>
      </div>

      {/* Arrows */}
      <button
        onClick={prevSlide}
        className="hidden sm:block absolute left-6 top-1/2 transform -translate-y-1/2 p-3 glass-card hover:glow-on-hover animate-smooth"
      >
        <ChevronLeft className="w-6 h-6 text-primary" />
      </button>
      <button
        onClick={nextSlide}
        className="hidden sm:block absolute right-6 top-1/2 transform -translate-y-1/2 p-3 glass-card hover:glow-on-hover animate-smooth"
      >
        <ChevronRight className="w-6 h-6 text-primary" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? "bg-primary glow-primary"
                : "bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSlider;
