import { FC } from "react";
import useCanvasWallet from "./CanvasWalletProvider";
import UserProfile from "./UserProfile"; // Ensure the correct path to UserProfile
import Main1 from "./Main1"; // Import Main1 component

const WalletComponent = () => {
  const { connectWallet, walletAddress, walletIcon, userInfo, content, signTransaction ,} =
    useCanvasWallet();

   
  return (
    <div>
      {
        !walletAddress && (<>
      <dotlottie-player src="https://lottie.host/50ced29f-5404-4fc8-8a8b-68bf2a714a14/JJ0z0rck4b.json" background="transparent" speed="1" style={{height:"150px", with: "150px"}} loop autoplay></dotlottie-player>
          <button onClick={connectWallet} style={{backgroundColor:"#6366F1", marginTop: "-10px"}}>Connect Solana Wallet</button>
          </> )
      }

      {userInfo && walletAddress && (
        <div>
          {userInfo.username && <UserProfile username={userInfo.username} walletAddress={walletAddress||"N/A"}  avatar={userInfo.avatar}/>}
        </div>
      )}


      {walletAddress &&  (
        <Main1 walletAddress={walletAddress} />
      )}
    </div>
  );
};

export default WalletComponent;
