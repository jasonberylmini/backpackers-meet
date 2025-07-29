import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="home-root">
      {/* Navigation */}
      <nav className="main-navbar">
        <Link to="/" className="navbar-logo">
          <img src="/src/assets/logo.png" alt="RideTribe" className="logo-img" onError={(e) => { e.target.style.display = 'none'; }} />
          <span className="logo-text">RideTribe</span>
        </Link>
        <div className="navbar-links">
          <Link to="/login">Login</Link>
          <Link to="/register">Sign Up</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero pt-20">
        <img className="hero-bg-img" src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80" alt="Travel background" />
        <div className="hero-content">
          <h1>Discover <span className="highlight">travel buddies</span> and connect with other like-minded <span className="highlight">travelers</span> across the globe.</h1>
          <p className="subtitle">Travel the world while meeting backpackers who want to see and do the same things as you do. Find others traveling to the same destination, collect virtual stamps and share photos with friends as you go!</p>
          <a href="/register" className="cta-btn">Start Your Adventure</a>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="feature">
          <img className="feature-img" src="https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80" alt="Find a travel buddy" />
          <h2>Find Travel Buddies</h2>
          <p>Whether you're traveling solo or in a group, RideTribe is a great way to meet nearby travelers. Browse through numerous profiles and message the people you want to meet. The opportunities are endless.</p>
        </div>
        <div className="feature">
          <img className="feature-img" src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80" alt="The Common Room" />
          <h2>Join The Community</h2>
          <p>Ask travelers what the best sites to see are, the best bar to drink in, or even organize meet-ups. The 'nearby' tab allows you to see what's going on around you, while the 'worldwide' tab is a more universal way of finding out information from around the world.</p>
        </div>
        <div className="feature">
          <img className="feature-img" src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80" alt="Meet People To Travel With" />
          <h2>Plan Together</h2>
          <p>Enter a date and city and RideTribe will show you all the travelers going there at the same time. If they match your interests, you can plan to meet or travel together.</p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="offers">
        <h2>Why Choose RideTribe?</h2>
        <ul>
          <li>
            <span className="offer-icon">🌍</span>
            <span>Connect with travelers worldwide</span>
          </li>
          <li>
            <span className="offer-icon">🔒</span>
            <span>Safe and verified community</span>
          </li>
          <li>
            <span className="offer-icon">💰</span>
            <span>Split costs and save money</span>
          </li>
          <li>
            <span className="offer-icon">📱</span>
            <span>Real-time messaging and updates</span>
          </li>
          <li>
            <span className="offer-icon">🎯</span>
            <span>Find travelers with similar interests</span>
          </li>
          <li>
            <span className="offer-icon">🚀</span>
            <span>Plan trips together easily</span>
          </li>
        </ul>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Start Your Journey?</h2>
        <p>Join thousands of travelers who have already found their perfect travel buddies on RideTribe.</p>
        <a href="/register" className="cta-btn">Join Now - It's Free!</a>
      </section>
    </div>
  );
} 