import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import UserProfile from '../UserProfile/UserProfile';
import './../../index'
import './About.css';

export default function AboutUs() {
    const navigate = useNavigate();
    const navRef = useRef(null);
    const btnRef = useRef(null);
    const [menuActive, setMenuActive] = useState(false);

    // Go back one step in history
    const goBack = () => {
        navigate(-1);
    };

    // Toggle mobile menu
    const toggleMenu = () => {
        setMenuActive((prev) => !prev);
    };

    useEffect(() => {
        const handleScroll = () => {
        const nav = navRef.current;
        const btn = btnRef.current;
        if (!nav || !btn) return;

        if (window.scrollY >= 250) {
            nav.classList.remove("navdefault");
            nav.classList.add("navscroll");
            btn.style.display = "block";
        } else {
            nav.classList.add("navdefault");
            nav.classList.remove("navscroll");
            btn.style.display = "none";
        }
        };

        window.addEventListener("scroll", handleScroll);

        // Cleanup
        return () => {
        window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    // Scroll to top on button click
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <>
        <header>
            <div className="logo-ab">
                <a onClick={goBack} style={{ cursor: "pointer" }}>
                    <img className="arrow-ab" src="./../../assets/images/arrow.png" title="Go one step back" alt="Back"/>
                </a>
                <Link to="/home">
                    <img className="logo-ab" src="./../../assets/images/EV-Logo.png" alt="Logo"/>
                </Link>
            </div>

            <div className="menu-toggle-ab" onClick={toggleMenu}>
                <img src="./../../assets/images/menu-toggel.png"className="toggle" aria-hidden="true" alt="Menu toggle" />
            </div>

            <nav ref={navRef} className={menuActive ? "active navdefault" : "navdefault"} >
            <ul>
                <li><Link to="/home">Home</Link></li>
                <li><Link className="act-ab" to="/about">About Us</Link></li>
                <li><Link to="/activevotes">Active Votes</Link></li>
                <li><Link to="/addnewvote">Add New Vote</Link></li>
                <li><Link to="/voteshistory">Votes History</Link></li>
                <li>
                    <UserProfile />
                </li>
            </ul>
            </nav>
        </header>

        <section className="landing-img-ab">
            <div className="layer-ab">
            <div className="landing-info-ab">
                <h1 className="large-heading-ab">Bulding Trust</h1>

                <h2 className="large-heading2-ab">Through Innovation</h2>
            </div>
            </div>


            <div className="aboutPart-ab">
            <div className="about-divs-ab">
                <div className="about-ab">
                <h1 className="about-header-ab"> Who We Are </h1>
                <p className="para2-ab">
                    Welcome to our Blockchain-Based E-Voting System,
                    <br />
                    a revolutionary platform designed to redefine the way elections
                    are conducted.
                    <br />
                    We are a team of passionate computer science students committed
                    to using emerging technologies to solve real-world challenges.
                    <br />
                    Our focus is on building innovative digital solutions that
                    prioritize security,
                    <br />
                    transparency, and user trust. With a shared vision and diverse
                    technical skills,
                    <br />
                    we aim to transform traditional voting into a modern, reliable
                    process.
                </p>
                </div>
                <img
                src="./../../assets/images/4.jpg"
                className="about-img"
                alt="About Us"
                />
            </div>
            </div>

            <div className="WhatDoPart">
            <div className="WhatDo-divs">
                <div className="WhatDo">
                <h1 className="WhatDo-header"> What We Do </h1>
                <p className="WhatDopara">
                    We've developed a Blockchain-Based E-Voting System that ensures
                    every vote
                    <br />
                    is secure, anonymous, and immutable.
                    <br />
                    Our platform combines the power of blockchain to store
                    unchangeable
                    <br />
                    records with AI-powered facial recognition to verify voter
                    identity — all while
                    <br />
                    maintaining user privacy.
                    <br />
                    We aim to provide a smooth and user-friendly voting experience
                    for everyone.
                </p>
                </div>
            </div>
            </div>

            <div className="WhyUsPart">
                <div className="WhyUs-divs">
                    <div className="WhyUs">
                        <h1 className="WhyUs-header"> Why Choose Us </h1>
                        <ul className="WhyUslists">
                            <li>Tamper-Proof Voting: Votes are securely stored on a decentralized blockchain.</li>
                            <li>AI Authentication: Facial recognition ensures only verified users can vote.</li>
                            <li>User-Friendly Interface: Designed for ease of use and accessibility.</li>
                            <li>Transparency Guaranteed: Every vote can be traced and verified (without revealing identity).</li>
                            <li>Option to Update Vote: Voters can securely change their choice before the deadline.</li>
                        </ul>
                    </div>
                    <img src="./../../assets/images/aboutWhyUs.jpg" className="WhyUs-img" alt="Why Choose Us" />
                </div>
            </div>

            <button className="btn-ab" id="scrollToTop" ref={btnRef} onClick={scrollToTop} style={{ display: "none" }} aria-label="Scroll to top" >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M12 4l-6 6h4v10h4V10h4z" />
                </svg>
            </button>

        </section>
        </>
    );
}
