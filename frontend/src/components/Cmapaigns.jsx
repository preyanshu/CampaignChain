import React, { useState, useEffect } from "react";
import idl from "../idl.json";
import {
  PublicKey,
  clusterApiUrl,
  Connection,
  SystemProgram,
} from "@solana/web3.js";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { toast } from "react-toastify";
import { Buffer } from "buffer";
import Modal from "react-modal"; 
import useCanvasWallet from "../Provider/CanvasWalletProvider";
import { encode } from "bs58";

window.Buffer = Buffer;

const Campaigns = ({ walletAddress }) => {
  const [campaigns, setCampaigns] = useState();
  const [activeTab, setActiveTab] = useState("myCampaigns");
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isDonateModalOpen, setDonateModalOpen] = useState(false);
  const [isWithdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [isConfirmModalOpen, setisConfirmModalOpen] = useState(false);
  const [callFun, setCallFun] = useState("");
  const [newCampaign, setNewCampaign] = useState({ name: "", description: "" });
  const [donationAmount, setDonationAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [isCreatedCampaign, setIsCreatedCampaign] = useState(false);
  const programId = new PublicKey(idl.address);
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const SOLANA_MAINNET_CHAIN_ID = "solana:101";
  const { canvasClient } = useCanvasWallet();

  const signTransaction = async (transaction) => {
    if (!canvasClient || !walletAddress) {
      console.error("CanvasClient or walletAddress is not available");
      return null;
    }

    try {
      const network =
        process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com/";
      const connection = new Connection(network, "confirmed");

      // Fetch the latest blockhash
      const { blockhash } = await connection.getLatestBlockhash({
        commitment: "finalized",
      });
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(walletAddress);

      // Serialize the transaction
      const serializedTx = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const base58Tx = encode(serializedTx);
      setNewCampaign({ name: "", description: "" });
      setDonationAmount(0);
      setWithdrawAmount(0);

      // Sign and send the transaction via canvasClient
      const results = await canvasClient.signAndSendTransaction({
        unsignedTx: base58Tx,
        awaitCommitment: "confirmed",
        chainId: SOLANA_MAINNET_CHAIN_ID,
      });

      if (results?.untrusted?.success) {
        toast.success("transaction signed");
        getCampaigns();
        console.log("Transaction signed:", results);
        return results;
      } else {
        toast.error("Failed to sign transaction");
        console.error("Failed to sign transaction");
      }
    } catch (error) {
      toast.error("Failed to sign transaction");
      console.error("Error signing transaction:", error);
    }
    return null;
  };

  const customStyles = {
    content: {
      position: "absolute",
      inset: "12% 40px 40px 5%",
      border: "none",
      backgroundColor: "rgb(30, 41, 59)",
      overflow: "auto",
      borderRadius: "8px",
      outline: "none",
      padding: "20px",
      color: "rgb(255, 255, 255)",
      width: "400px",
      margin: "auto",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
    },
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.8)",
    },
  };

  useEffect(() => {
    if (walletAddress) {
      getCampaigns();
    }
  }, [walletAddress]);

  useEffect(() => {
    if (
      campaigns &&
      campaigns.some((campaign) => campaign.admin.toString() === walletAddress)
    ) {
      setIsCreatedCampaign(true);
    }
  }, [campaigns, walletAddress]);

  const getCampaigns = async () => {
    if (!walletAddress) {
      toast.info("Wallet not connected.");
      return;
    }
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: new PublicKey(walletAddress),
        signTransaction,
      },
      {
        commitment: "confirmed",
      }
    );
    const program = new Program(idl, provider);

    const campaignAccounts = await connection.getProgramAccounts(programId);
    const fetchedCampaigns = await Promise.all(
      campaignAccounts.map(async (campaign) => ({
        ...(await program.account.campaign.fetch(campaign.pubkey)),
        pubkey: campaign.pubkey,
      }))
    );

    setCampaigns(fetchedCampaigns);
  };

  const createCampaign = async () => {
    if (!walletAddress) {
      setNewCampaign({ name: "", description: "" });
      toast.info("Connect your wallet first");
      return;
    }
    if (!newCampaign.name || !newCampaign.description) {
      setNewCampaign({ name: "", description: "" });
      toast.info("Invalid input.");
      return;
    }

    if (isCreatedCampaign) {
      setNewCampaign({ name: "", description: "" });
      toast.error("Can not create more than one campaign");
      return;
    }

    const provider = new AnchorProvider(
      connection,
      {
        publicKey: new PublicKey(walletAddress),
        signTransaction,
      },
      {
        commitment: "confirmed",
      }
    );

    const program = new Program(idl, provider);

    const [campaign] = PublicKey.findProgramAddressSync(
      [Buffer.from("CAMPAIGN_DEMO"), new PublicKey(walletAddress).toBuffer()],
      program.programId
    );

    const res = await program.methods
      .create(newCampaign.name, newCampaign.description)
      .accounts({
        campaign,
        user: new PublicKey(walletAddress),
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    if (res) {
      console.log("Created a new campaign w/ address:", campaign.toString());
      toast("Created a new campaign");
    }
  };

  const donate = async () => {
    if (!walletAddress) {
      setDonationAmount(0);
      toast.info("Connect your wallet first");
      return;
    }
    if (!selectedCampaign || donationAmount < 0.02) {
      setDonationAmount(0);
      toast.info("Donation amount should be greater than 0.02 SOL.");
      console.error("Invalid donation amount.");
      return;
    }

    const provider = new AnchorProvider(
      connection,
      {
        publicKey: new PublicKey(walletAddress),
        signTransaction,
      },
      {
        commitment: "confirmed",
      }
    );
    const program = new Program(idl, provider);

    const res = await program.methods
      .donate(new BN(donationAmount * 1e9)) // Convert SOL to lamports (1 SOL = 1e9 lamports)
      .accounts({
        campaign: selectedCampaign,
        user: new PublicKey(walletAddress),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    if (res) {
      console.log(
        "Donated:",
        donationAmount,
        "to:",
        selectedCampaign.toString()
      );
      toast.success(
        "Donated:",
        donationAmount,
        "to:",
        selectedCampaign.toString()
      );
    } else {
      console.log(res);
    }
  };

  const withdraw = async () => {
    if (!walletAddress) {
      setWithdrawAmount(0);
      toast.info("Connect your wallet first");
      return;
    }
    if (!selectedCampaign || withdrawAmount < 0.02) {
      setWithdrawAmount(0);
      toast.info("Withdrawal amount should be greater than 0.02 SOL.");
      return;
    }

    const provider = new AnchorProvider(
      connection,
      {
        publicKey: new PublicKey(walletAddress),
        signTransaction,
      },
      {
        commitment: "confirmed",
      }
    );
    const program = new Program(idl, provider);

    const res = await program.methods
      .withdraw(new BN(withdrawAmount * 1e9)) // Convert SOL to lamports (1 SOL = 1e9 lamports)
      .accounts({
        campaign: selectedCampaign,
        user: new PublicKey(walletAddress),
      })
      .rpc();

    if (res) {
      console.log(
        "Withdrew:",
        withdrawAmount,
        "from:",
        selectedCampaign.toString()
      );
      toast.success(
        "Withdrew:",
        withdrawAmount,
        "from:",
        selectedCampaign.toString()
      );
    } else {
      console.log(res);
    }
  };

  const handleConfirm = () => {
    setSelectedCampaign(null);
    if (callFun === "campaign") {
      setCreateModalOpen(false);
      createCampaign();
    } else if (callFun === "donate") {
      setDonateModalOpen(false);
      donate();
    } else if (callFun === "withdraw") {
      setWithdrawModalOpen(false);
      withdraw();
    }
    setisConfirmModalOpen(false);
  };

  const renderCampaigns = (isOwnCampaigns) => (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      {isOwnCampaigns && (
        <div
          style={{
            width: "100%",
            maxWidth: "800px",
            textAlign: "center",
            marginBottom: "16px",
            color: "#fff",
          }}
        >
          <p style={{ color: "#ccc" }}>
            Note: You can only create a campaign once per account.
          </p>
        </div>
      )}
      {!campaigns && (
        <div className="flex justify-center w-full h-full items-center">
          <div
            className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full"
            role="status"
          ></div>
          <span className="ml-2 text-lg">Loading...</span>
        </div>
      )}

      {campaigns &&
        (campaigns.length > 0 &&
         campaigns
          .filter((campaign) => {
            return isOwnCampaigns
              ? campaign.admin.toString() === walletAddress
              : campaign.admin.toString() !== walletAddress;
          })
          .map((campaign) => (
            <div
              key={campaign.pubkey.toString()}
              style={{
                width: "100%",
                maxWidth: "800px",
                border: "1px solid grey",
                borderRadius: "8px",
                padding: "16px",
                margin: "16px 0",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                backgroundColor: "#1C212E",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginBottom: "48px",
                  textAlign: "left",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 8px",
                    color: "#00BCD4",
                  }}
                >
                  {campaign.name}
                </h3>
                <p style={{ margin: "4px 0", color: "#ccc" }}>
                  <strong>Description:</strong> {campaign.description}
                </p>
                <p style={{ margin: "4px 0", color: "#ccc" }}>
                  <strong>Balance:</strong>{" "}
                  {(campaign.amountDonated / 1e9).toFixed(2)} SOL
                </p>
                <p style={{ margin: "4px 0", color: "#ccc" }}>
                  <strong>Admin:</strong> {campaign.admin.toString()}
                </p>
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: "16px",
                  right: "16px",
                  display: "flex",
                  gap: "8px",
                }}
              >
                <button
                  onClick={() => {
                    setDonateModalOpen(true);
                    setSelectedCampaign(campaign.pubkey);
                  }}
                  style={{
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: "4px",
                    backgroundColor: "#6366F1",
                    color: "#fff",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                    transition: "background-color 0.3s ease",
                  }}
                >
                  Donate
                </button>
                {campaign.admin.toString() === walletAddress && (
                  <button
                    onClick={() => {
                      if (
                        (campaign.amountDonated / 1e9).toFixed(2) <
                        withdrawAmount
                      ) {
                        toast.error("Cannot withdraw from campaign.");
                        return;
                      }
                      setWithdrawModalOpen(true);
                      setSelectedCampaign(campaign.pubkey);
                    }}
                    style={{
                      padding: "8px 16px",
                      border: "none",
                      borderRadius: "4px",
                      backgroundColor: "#6366F1",
                      color: "#fff",
                      cursor: "pointer",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                      transition: "background-color 0.3s ease",
                    }}
                  >
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          ))
        )
      }
    </div>
  );

  return (
    <div style={{ padding: "16px" }}>
      {walletAddress ? (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "16px",
              gap: "16px",
            }}
          >
            <button
              onClick={() => {
                setActiveTab("myCampaigns");
                getCampaigns();
              }}
              style={{
                padding: "12px 24px",
                border: "2px solid",
                width: "54%",
                borderColor:
                  activeTab === "myCampaigns" ? "#00BCD4" : "#1C212E",
                backgroundColor:
                  activeTab === "myCampaigns" ? "#1C212E" : "#2F3C57",
                color: activeTab === "myCampaigns" ? "#00BCD4" : "#fff",
                cursor: "pointer",
                fontWeight: activeTab === "myCampaigns" ? "bold" : "normal",
                transition: "all 0.3s ease",
              }}
            >
              My Campaigns
            </button>
            <button
              onClick={() => {
                setActiveTab("otherCampaigns");
                getCampaigns();
              }}
              style={{
                padding: "12px 24px",
                border: "2px solid",
                width: "54%",
                borderColor:
                  activeTab === "otherCampaigns" ? "#00BCD4" : "#1C212E",
                backgroundColor:
                  activeTab === "otherCampaigns" ? "#1C212E" : "#2F3C57",
                color: activeTab === "otherCampaigns" ? "#00BCD4" : "#fff",
                cursor: "pointer",
                fontWeight: activeTab === "otherCampaigns" ? "bold" : "normal",
                transition: "all 0.3s ease",
              }}
            >
              Other Campaigns
            </button>
          </div>
          {activeTab === "myCampaigns" && (
            <div>
              <button
                onClick={() => setCreateModalOpen(true)}
                style={{
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: "4px",
                  backgroundColor: "#6366F1",
                  color: "#fff",
                  width: "100%",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  transition: "background-color 0.3s ease",
                  marginBottom: "23px",
                  marginTop: "10px",
                }}
              >
                Create Campaign +
              </button>
              {renderCampaigns(true)}
            </div>
          )}
          {activeTab === "otherCampaigns" && renderCampaigns(false)}
        </div>
      ) : (
        <></>
      )}

      {/* Create Campaign Modal */}
      <Modal
        style={customStyles}
        isOpen={isCreateModalOpen}
        onRequestClose={() => setCreateModalOpen(false)}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <h2>Create Campaign</h2>
          <form
            className="dark bg-gray-900 flex flex-col"
            style={{ width: "100%" }}
          >
            <label
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                marginBottom: "10px",
                color: "#fff",
              }}
            >
              <span>Campaign Name:</span>
              <input
                type="text"
                value={newCampaign.name}
                onChange={(e) =>
                  setNewCampaign({ ...newCampaign, name: e.target.value })
                }
              />
            </label>
            <label
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                marginBottom: "10px",
                color: "#fff",
              }}
            >
              <span>Campaign Description:</span>
              <textarea
                value={newCampaign.description}
                onChange={(e) =>
                  setNewCampaign({
                    ...newCampaign,
                    description: e.target.value,
                  })
                }
                style={{
                  backgroundColor: "#374151",
                  color: "#fff",
                  borderRadius: "4px",
                  padding: "8px",
                  border: "none",
                  width: "91%",
                  marginLeft: "10px",
                  minHeight: "60px",
                  fontFamily: "INHERIT",
                  fontSize: "16px",
                }}
              />
            </label>
            <div>
              <button
                type="button"
                style={{
                  padding: "12px 24px",
                  border: "none",
                  width: "100%",
                  borderRadius: "4px",
                  backgroundColor: "rgb(99, 102, 241)", // Button color (rgb(99, 102, 241))
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  transition: "background-color 0.3s ease",
                  marginBottom: "10px",
                  marginTop: "10px",
                }}
                onClick={() => {
                  setCallFun("campaign");
                  setisConfirmModalOpen(true);
                }}
              >
                Create
              </button>
              <button
                type="button"
                style={{
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: "4px",
                  backgroundColor: "#FF4C4C",
                  color: "#fff",
                  width: "100%",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  transition: "background-color 0.3s ease",
                  marginBottom: "10px",
                  marginTop: "10px",
                }}
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Donate Modal */}
      <Modal
        style={customStyles}
        isOpen={isDonateModalOpen}
        onRequestClose={() => setDonateModalOpen(false)}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignContent: "center",
          }}
        >
          <h2>Donate to Campaign</h2>
          <form
            className="dark bg-gray-900 flex flex-col"
            style={{ width: "100%" }}
          >
            <label
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                marginBottom: "10px",
                color: "#fff",
              }}
            >
              <span>Donation Amount (Minimum 0.02 SOL):</span>
              <input
                type="number"
                value={donationAmount}
                onChange={(e) => setDonationAmount(Number(e.target.value))}
                min="0"
              />
            </label>
            <div>
              <button
                type="button"
                style={{
                  padding: "12px 24px",
                  border: "none",
                  width: "100%",
                  borderRadius: "4px",
                  backgroundColor: "rgb(99, 102, 241)", // Button color (rgb(99, 102, 241))
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  transition: "background-color 0.3s ease",
                  marginBottom: "10px",
                  marginTop: "10px",
                }}
                onClick={() => {
                  setCallFun("donate");
                  setisConfirmModalOpen(true);
                }}
              >
                Donate
              </button>
              <button
                type="button"
                style={{
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: "4px",
                  backgroundColor: "#FF4C4C",
                  color: "#fff",
                  width: "100%",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  transition: "background-color 0.3s ease",
                  marginBottom: "10px",
                  marginTop: "10px",
                }}
                onClick={() => setDonateModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Withdraw Modal */}
      <Modal
        style={customStyles}
        isOpen={isWithdrawModalOpen}
        onRequestClose={() => setWithdrawModalOpen(false)}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignContent: "center",
          }}
        >
          <h2>Withdraw from Campaign</h2>
          <form
            className="dark bg-gray-900 flex flex-col"
            style={{ width: "100%" }}
          >
            <label
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                marginBottom: "10px",
                color: "#fff",
              }}
            >
              Withdrawal Amount (Minimum 0.02 SOL):
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                min="0"
              />
            </label>
            <div>
              <button
                type="button"
                style={{
                  padding: "12px 24px",
                  border: "none",
                  width: "100%",
                  borderRadius: "4px",
                  backgroundColor: "rgb(99, 102, 241)", // Button color (rgb(99, 102, 241))
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  transition: "background-color 0.3s ease",
                  marginBottom: "10px",
                  marginTop: "10px",
                }}
                onClick={() => {
                  setCallFun("withdraw");
                  setisConfirmModalOpen(true);
                }}
              >
                Withdraw
              </button>
              <button
                type="button"
                style={{
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: "4px",
                  backgroundColor: "#FF4C4C",
                  color: "#fff",
                  width: "100%",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  transition: "background-color 0.3s ease",
                  marginBottom: "10px",
                  marginTop: "10px",
                }}
                onClick={() => setWithdrawModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal
        style={customStyles}
        isOpen={isConfirmModalOpen}
        onRequestClose={() => setisConfirmModalOpen(false)}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignContent: "center",
          }}
        >
          <p style={{
            background: "#1a1e1e",
            padding: "10px",
            borderRadius: "5px",
            color: "orange",
            fontSize: "20px",
          }}>
            Before making this transection make sure you have enough balance in
            your wallet!!
          </p>
          <div>
            <button
              type="button"
              style={{
                padding: "12px 24px",
                border: "none",
                width: "100%",
                borderRadius: "4px",
                backgroundColor: "rgb(99, 102, 241)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                transition: "background-color 0.3s ease",
                marginBottom: "10px",
                marginTop: "10px",
              }}
              onClick={handleConfirm}
            >
              Confirm
            </button>
            <button
              type="button"
              style={{
                padding: "12px 24px",
                border: "none",
                width: "100%",
                borderRadius: "4px",
                backgroundColor: "#FF4C4C",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                transition: "background-color 0.3s ease",
                marginBottom: "10px",
                marginTop: "10px",
              }}
              onClick={() => setisConfirmModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Campaigns;
