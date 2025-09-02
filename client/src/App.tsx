import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import QuestionGenerator from './pages/QuestionGenerator';
import QuestionList from './pages/QuestionList';
import QuestionSets from './pages/QuestionSets';
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
