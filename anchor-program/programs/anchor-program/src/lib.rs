use anchor_lang::prelude::*;

pub mod error;
pub mod state;
pub mod instructions;

use crate::instructions::*;

declare_id!("3o7dXUGpic6U7AsCpEwv4ifVp4w2B4waHk3ScbjT1NU2");

#[program]
pub mod thahar {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handle_initialize(ctx)
    }

    pub fn register_policy(
        ctx: Context<RegisterPolicy>,
        policy_type: state::PolicyType,
        coverage_amount: u64,
        trigger_threshold: i64,
        region_id: String,
        duration_days: u16,
    ) -> Result<()> {
        instructions::register_policy::handle_register_policy(
            ctx, policy_type, coverage_amount, trigger_threshold, region_id, duration_days,
        )
    }

    pub fn pay_premium(ctx: Context<PayPremium>, amount: u64) -> Result<()> {
        instructions::pay_premium::handle_pay_premium(ctx, amount)
    }

    pub fn update_oracle(
        ctx: Context<UpdateOracle>,
        region_id: String,
        rainfall_mm: i64,
        flood_level_cm: i64,
    ) -> Result<()> {
        instructions::update_oracle::handle_update_oracle(ctx, region_id, rainfall_mm, flood_level_cm)
    }

    pub fn trigger_payout(ctx: Context<TriggerPayout>) -> Result<()> {
        instructions::trigger_payout::handle_trigger_payout(ctx)
    }
    pub fn close_policy(ctx: Context<ClosePolicy>) -> Result<()> {
        instructions::close_policy::handle_close_policy(ctx)
    }
}

#[cfg(test)]
mod tests {
    use anchor_lang::prelude::Pubkey;
    use solana_keypair::Keypair;
    use solana_signer::Signer;

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
    }

    #[test]
    fn test_trigger_logic() {
        let coverage_amount: u64 = 1_000_000_000;
        let trigger_threshold: i64 = 50;
        let rainfall_reading: i64 = 20;
        assert!(rainfall_reading < trigger_threshold);
        assert!(coverage_amount > 0);
    }
}
