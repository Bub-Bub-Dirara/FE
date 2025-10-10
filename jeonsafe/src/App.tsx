import './App.css'
import './index.css'
import RootLayout from './layout/root-layout';
import ErrorPage from './pages/errorPage';
import HomePage from './pages/homePage';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import UploadPage from './pages/uploadPage';
import PreparationPage from './pages/preparationPage';
import ProcessingPage from './pages/postprocessingPage';

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
        path:'uploadpage',
        element: <UploadPage />
      },
      {
        path:'postprocessing',
        element: <ProcessingPage />
      },
      {
        path:'preparation',
        element: <PreparationPage />
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
    <>
      <RouterProvider router={router} />
    </>
  )
}

export default App;
