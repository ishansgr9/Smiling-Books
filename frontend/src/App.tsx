import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';

// Layouts
import RootLayout from './layouts/RootLayout';
import AdminLayout from './layouts/AdminLayout';

// Pages
import Home from './pages/Home';
import Library from './pages/Library';
import BookDetails from './pages/BookDetails';
import PDFReader from './pages/PDFReader';
import About from './pages/About';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminBooks from './pages/AdminBooks';
import AdminBookForm from './pages/AdminBookForm';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Website Routes */}
          <Route path="/" element={<RootLayout />}>
            <Route index element={<Home />} />
            <Route path="library" element={<Library />} />
            <Route path="books/:id" element={<BookDetails />} />
            <Route path="about" element={<About />} />
          </Route>

          {/* Distraction-Free PDF Reader (No standard headers/footers) */}
          <Route path="/books/:id/read" element={<PDFReader />} />

          {/* Admin Authentication */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected Admin Console Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="books" element={<AdminBooks />} />
            <Route path="books/new" element={<AdminBookForm />} />
            <Route path="books/:id/edit" element={<AdminBookForm />} />
          </Route>

          {/* Fallback Catch-All */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
