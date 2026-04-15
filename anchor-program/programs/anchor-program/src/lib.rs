use anchor_lang::prelude::*;

pub mod error;
pub mod state;
pub mod instructions;

use instructions::*;

declare_id!("8Q3bQZA37hRwJ84DcrcVMp7k4LrGLjdoBGsgF6N9iEEp");

#[program]
pub mod thahar {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    pub fn register_policy(
        ctx: Context<RegisterPolicy>,
        policy_type: state::PolicyType,
        coverage_amount: u64,
        trigger_threshold: i64,
        region_id: String,
    ) -> Result<()> {
        instructions::register_policy::handler(
            ctx,
            policy_type,
            coverage_amount,
            trigger_threshold,
            region_id,
        )
    }

    pub fn pay_premium(ctx: Context<PayPremium>, amount: u64) -> Result<()> {
        instructions::pay_premium::handler(ctx, amount)
    }

    pub fn update_oracle(
        ctx: Context<UpdateOracle>,
        rainfall_mm: i64,
        flood_level_cm: i64,
    ) -> Result<()> {
        instructions::update_oracle::handler(ctx, rainfall_mm, flood_level_cm)
    }

    pub fn trigger_payout(ctx: Context<TriggerPayout>) -> Result<()> {
        instructions::trigger_payout::handler(ctx)
    }
}
