import { useState, FC, useEffect } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import { CanvasWalletProvider } from './CanvasWalletProvider';
import WalletComponent from './WalletComponent';
import Main1 from './Main1';
import { ToastContainer, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const App = () => {


  return (
    <CanvasWalletProvider>
      
      <div >
      
        <WalletComponent />
        
      </div>
     
      <div>
        <Main1 />
      </div>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
          transition={Bounce}
        />
    </CanvasWalletProvider>
  );
};
