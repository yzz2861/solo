import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Practice from "@/pages/Practice";
import TeacherView from "@/pages/TeacherView";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/practice/:id" element={<Practice />} />
        <Route path="/teacher" element={<TeacherView />} />
      </Routes>
    </Router>
  );
}
