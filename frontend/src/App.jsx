import './App.css';
import { CanvasWalletProvider } from './Provider/CanvasWalletProvider';
import WalletComponent from './components/WalletComponent';
import Campaigns from './components/Cmapaigns';
import { ToastContainer, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const App = () => {


  return (
    <CanvasWalletProvider>
      
      <div >
      
        <WalletComponent />
        
      </div>
     
      <div>
        <Campaigns />
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
