import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Calculator from "@/pages/Calculator";
import RecipeList from "@/pages/RecipeList";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Calculator />} />
        <Route path="/recipes" element={<RecipeList />} />
      </Routes>
    </Router>
  );
}
