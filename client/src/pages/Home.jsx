import React from 'react';
import './Home.css';

export default function Home() {
  return (
    <div className="home-root">
      {/* Hero Section */}
      <section className="hero">
        <img className="hero-bg-img" src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80" alt="Travel background" />
        <div className="hero-content">
          <h1>Discover <span className="highlight">travel buddies</span> and connect with other like-minded <span className="highlight">travellers</span> across the globe.</h1>
          <p className="subtitle">Travel the world while meeting backpackers who want to see and do the same things as you do. Find others travelling to the same destination, collect virtual stamps and share photos with friends as you go!</p>
          <a href="/register" className="cta-btn">Join Now!</a>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="feature">
          <img className="feature-img" src="https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80" alt="Find a travel buddy" />
          <h2>Find a travel buddy</h2>
          <p>Whether you're travelling solo or in a group, RideTribe is a great way to meet nearby travellers. Browse through numerous profiles and message the people you want to meet. The opportunities are endless.</p>
        </div>
        <div className="feature">
          <img className="feature-img" src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80" alt="The Common Room" />
          <h2>The Common Room</h2>
          <p>Ask travellers what the best sites to see are, the best bar to drink in, or even organise meet-ups. The 'nearby' tab allows you to see what's going on around you, while the 'worldwide' tab is a more universal way of finding out information from around the world.</p>
        </div>
        <div className="feature">
          <img className="feature-img" src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80" alt="Meet People To Travel With" />
          <h2>Meet People To Travel With</h2>
          <p>Enter a date and city and RideTribe will show you all the travellers going there at the same time. If they match your interests, you can plan to meet or travel together.</p>
        </div>
      </section>
    </div>
  );
} 