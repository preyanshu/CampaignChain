import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

import { assert } from "chai";

describe("crowdfunding", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Crowdfunding ;

  let campaignPDA: anchor.web3.PublicKey;
  let campaignBump: number;
  
  it("Creates a campaign!", async () => {
    // Derive the campaign PDA using a seed
    [campaignPDA, campaignBump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("CAMPAIGN_DEMO"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    await program.methods.create("Test Campaign", "This is a test campaign").accounts({
      campaign: campaignPDA,
      user: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();

    // Fetch the account data
    const account = await program.account.campaign.fetch(campaignPDA);

    // Verify the account state
    assert.strictEqual(account.name, "Test Campaign");
    assert.strictEqual(account.description, "This is a test campaign");
    assert.strictEqual(account.amountDonated.toNumber(), 0);
    assert.strictEqual(account.admin.toBase58(), provider.wallet.publicKey.toBase58());
  });

  it("Donates to the campaign!", async () => {
    await program.methods.donate(new anchor.BN(1000)).accounts({
      campaign: campaignPDA,
      user: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();

    // Fetch the account data
    const account = await program.account.campaign.fetch(campaignPDA);

    // Verify the account state
    assert.isTrue(account.amountDonated.eq(new anchor.BN(1000)));
  });

  it("Withdraws from the campaign!", async () => {
    await program.methods.withdraw(new anchor.BN(500)).accounts({
      campaign: campaignPDA,
      user: provider.wallet.publicKey,
    }).rpc();

    // Fetch the account data
    const account = await program.account.campaign.fetch(campaignPDA);

    // Verify the account state

    console.log(account.amountDonated.toNumber());
    
    assert.isTrue(account.amountDonated.eq(new anchor.BN(500)));
  });
});
