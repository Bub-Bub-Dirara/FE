import './App.css'
import './index.css'
import RootLayout from './layout/root-layout';
import ErrorPage from './pages/errorPage';
import HomePage from './pages/homePage';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import UploadPage from './pages/uploadPage';
import RiskPage from "./pages/riskPage";                
import MappingPage from "./pages/mappingPage";         

import CollectPage from "./pages/collectPage";
import ClassifyPage from "./pages/classifyPage";       
import SimulatePage from "./pages/simulatePage"; 

import StepLayout from './layout/step-layout';
import { ProgressProvider } from './stores/progress-provider';

const router=createBrowserRouter([
  {
    path:'/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: "pre",
        element: <StepLayout />,
        children: [
          { path: "upload", element: <UploadPage /> },
          { path: "risk", element: <RiskPage /> },
          { path: "mapping", element: <MappingPage /> },
        ],
      },
       {
        path: "post",
        element: <StepLayout />,
        children: [
          { path: "collect", element: <CollectPage /> },
          { path: "classify", element: <ClassifyPage /> },
          { path: "simulate", element: <SimulatePage /> },
        ],
      },
      {
        path: "*",
        element: <ErrorPage />
      }
    ] 
  },
]);

function App() {

  return (
    <ProgressProvider>
      <RouterProvider router={router} />
    </ProgressProvider>
  );
}

export default App;
