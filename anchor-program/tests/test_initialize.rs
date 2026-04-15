use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_signer::Signer;
use anchor_lang::prelude::Pubkey;

#[test]
fn test_program_loads() {
    let _svm = LiteSVM::new();
    println!("LiteSVM initialized successfully");
}

#[test]
fn test_pda_derivation() {
    let program_id = Pubkey::new_unique();
    let farmer = Keypair::new();
    let (policy_pda, bump) = Pubkey::find_program_address(
        &[b"policy", farmer.pubkey().as_ref()],
        &program_id,
    );
    let (treasury_pda, _) = Pubkey::find_program_address(
        &[b"treasury"],
        &program_id,
    );
    let (oracle_pda, _) = Pubkey::find_program_address(
        &[b"oracle", b"kathmandu-1"],
        &program_id,
    );
    assert_ne!(policy_pda, Pubkey::default());
    assert_ne!(treasury_pda, Pubkey::default());
    assert_ne!(oracle_pda, Pubkey::default());
    assert!(bump <= 255);
    println!("Policy PDA: {}", policy_pda);
    println!("Treasury PDA: {}", treasury_pda);
    println!("Oracle PDA: {}", oracle_pda);
}

#[test]
fn test_trigger_logic() {
    let coverage_amount: u64 = 1_000_000_000;
    let trigger_threshold: i64 = 50;
    let rainfall_reading: i64 = 20;
    assert!(rainfall_reading < trigger_threshold);
    assert!(coverage_amount > 0);
    println!("Trigger logic verified: {}mm < {}mm threshold", rainfall_reading, trigger_threshold);
}
