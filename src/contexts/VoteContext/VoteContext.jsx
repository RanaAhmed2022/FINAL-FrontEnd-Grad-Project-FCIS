import React, { createContext, useState, useEffect } from 'react';

export const VoteContext = createContext();

export const VoteProvider = ({ children }) => {
    const [votes, setVotes] = useState(() => {
        // Get votes from localStorage on initial load
        const storedVotes = localStorage.getItem('votes');
        return storedVotes ? JSON.parse(storedVotes) : [];
    });

    // Update localStorage whenever votes change
    useEffect(() => {
        localStorage.setItem('votes', JSON.stringify(votes));
    }, [votes]);

    const addVote = (newVote) => {
        setVotes((prevVotes) => [...prevVotes, newVote]);
    };

    return (
        <VoteContext.Provider value={{ votes, addVote }}>
        {children}
        </VoteContext.Provider>
    );
};
