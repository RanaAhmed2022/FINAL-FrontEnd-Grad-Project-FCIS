import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Welcome from './components/Welcome/Welcome';
import Registration from './components/Registration/Registration';
import Home from './components/Home/Home'
import About from './components/About/About'
import Addnewvote from './components/Addnewvote/Addnewvote'
import ProposalSearch from './components/ProposalSearch/ProposalSearch'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';

import { ThirdwebProvider } from "thirdweb/react";

function App() {
  return (
    <ThirdwebProvider>
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        {/* <Route path="/login" element={<Login />} /> */}
        <Route path="/registration" element={<Registration />} />
        <Route path="/home" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/about" element={
          <ProtectedRoute>
            <About />
          </ProtectedRoute>
        } />
        <Route path="/addnewvote" element={
          <ProtectedRoute>
            <Addnewvote />
          </ProtectedRoute>
        } />
        <Route path="/search-proposals" element={
          <ProtectedRoute>
            <ProposalSearch />
          </ProtectedRoute>
        } />
        {/* Add more routes as you convert other components */}
      </Routes>
    </Router>
    </ThirdwebProvider>
  );
}

export default App;
