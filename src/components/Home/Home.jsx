import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UserProfile from '../UserProfile/UserProfile';
import './../../index'
import './Home.css';


const HomePage = () => {
    const scrollTopButtonRef = useRef(null);
    const navRef = useRef(null);
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const menuToggle = document.querySelector('.menu-toggle');
        const nav = navRef.current;
        const btn = scrollTopButtonRef.current;

        // Toggle mobile nav menu
        if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
        });
        }

        // Handle scroll event
        const handleScroll = () => {
        if (nav && btn) {
            if (window.scrollY >= 250) {
            nav.classList.remove('navdefault');
            nav.classList.add('navscroll');
            btn.style.display = 'block';
            } else {
            nav.classList.add('navdefault');
            nav.classList.remove('navscroll');
            btn.style.display = 'none';
            }
        }
        };

        window.addEventListener('scroll', handleScroll);

        // Scroll to top button
        if (btn) {
        btn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        }

        return () => {
        window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <>
        <header>
            <div className="logo">
            <Link to="#">
                <img className="logo" src="/assets/images/EV-Logo.png" alt="Logo" />
            </Link>
            </div>

            <div className="menu-toggle">
            <img src="/assets/images/menu-toggel.png" className="toggle" alt="Toggle Menu" />
            </div>

            <nav ref={navRef} className="navdefault">
            <ul>
                <li><Link className="act" to="/home">Home</Link></li>
                <li><Link to="/about">About Us</Link></li>
                <li><Link to="/search-proposals">Search Proposals</Link></li>
                <li><Link to="/addnewvote">Add New Vote</Link></li>
                <li>
                    <UserProfile />
                </li>
            </ul>
            </nav>
        </header>

        <section className="landing-img">
            <div className="layer">
            <div className="landing-info">
                <h1 className="large-heading">Vote with confidence</h1>
                <h2 className="large-heading2">Shape the Future!</h2>
                <p className="para">
                Every vote counts! Join us in building a brighter future by casting your vote easily and securely.
                </p>
                <div className="searchDiv">
                <input
                    type="text"
                    className="search-bar"
                    placeholder="Enter Proposal ID..."
                    title="Search for a Vote by ID"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && searchQuery.trim()) {
                            navigate('/search-proposals', { state: { proposalId: searchQuery.trim() } });
                        }
                    }}
                />
                <img 
                    src="/assets/images/search_icon.png" 
                    className="search_icon" 
                    alt="Search"
                    onClick={() => {
                        if (searchQuery.trim()) {
                            navigate('/search-proposals', { state: { proposalId: searchQuery.trim() } });
                        }
                    }}
                    style={{ cursor: 'pointer' }}
                />
                </div>
            </div>
            </div>

            <div className="business-section" id="areas"></div>

            <div className="aboutPart">
            <div className="about-divs">
                <div className="about">
                <h1 className="about-header">Who We Are</h1>
                <p className="para2">
                    Welcome to our Blockchain-Based E-Voting System, <br />
                    a revolutionary platform designed to redefine the way elections are conducted. <br />
                    Our mission is to provide a secure, transparent, and tamper-proof voting environment by leveraging the power of blockchain technology.
                </p>
                <Link to="/aboutus">
                    <button className="learnMore">Learn More</button>
                </Link>
                </div>
                <img src="/assets/images/4.jpg" className="about-img" alt="About" />
            </div>
            </div>

            <div className="votePart">
            <div className="vote-divs">
                <img src="/assets/images/Capture2.png" className="voteBackground" alt="Vote Background" />
                <div className="vote">
                <p className="para3">
                    Easy, Secure, and Fair Voting
                    <br />
                    - Cast Your Vote Now!
                </p>
                <Link to="/activevotes">
                    <button className="availableVotes">Show Active Votes</button>
                </Link>
                </div>
                <img src="/assets/images/77.png" className="vote-img" alt="Vote" />
            </div>
            </div>

            <button className="btn" id="scrollToTop" ref={scrollTopButtonRef}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 4l-6 6h4v10h4V10h4z" />
            </svg>
            </button>

            <Link to="/addnewvote" className="addbtn" id="addVote" title="Add New Vote">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 4v8M12 12v8M4 12h8M12 12h8" />
            </svg>
            </Link>

            <div className="votes"></div>
        </section>
        </>
    );
};

export default HomePage;
