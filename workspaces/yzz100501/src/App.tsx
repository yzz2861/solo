import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import StudentHome from "@/pages/StudentHome";
import GamePlay from "@/pages/GamePlay";
import Quiz from "@/pages/Quiz";
import StudentReview from "@/pages/StudentReview";
import TeacherDashboard from "@/pages/TeacherDashboard";
import LevelEditor from "@/pages/LevelEditor";
import TeacherReview from "@/pages/TeacherReview";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/student" element={<StudentHome />} />
        <Route path="/student/play/:levelId" element={<GamePlay />} />
        <Route path="/student/quiz/:levelId" element={<Quiz />} />
        <Route path="/student/review/:sessionId" element={<StudentReview />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/teacher/levels/edit/:levelId" element={<LevelEditor />} />
        <Route path="/teacher/review" element={<TeacherReview />} />
      </Routes>
    </Router>
  );
}
