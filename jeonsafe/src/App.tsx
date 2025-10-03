import './App.css'
import './index.css'
import RootLayout from './layout/root-layout';
import ErrorPage from './pages/errorPage';
import HomePage from './pages/homePage';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

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
        path:'popular',
        element: <UploadPage />
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
