import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header.tsx';
import Home from './pages/Home.tsx';
import Dashboard from './pages/Dashboard.tsx';
import QuestionGenerator from './pages/QuestionGenerator.tsx';
import QuestionList from './pages/QuestionList.tsx';
import QuestionSets from './pages/QuestionSets.tsx';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/generate" element={<QuestionGenerator />} />
            <Route path="/questions" element={<QuestionList />} />
            <Route path="/question-sets" element={<QuestionSets />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
