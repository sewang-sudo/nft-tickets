use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::{InsurancePolicy, PolicyStatus, ProgramTreasury};
use crate::error::ThaharError;

#[derive(Accounts)]
pub struct PayPremium<'info> {
    #[account(
        mut,
        seeds = [b"policy", farmer.key().as_ref()],
        bump = policy.bump,
        has_one = farmer
    )]
    pub policy: Account<'info, InsurancePolicy>,

    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump
    )]
    pub treasury: Account<'info, ProgramTreasury>,

    #[account(mut)]
    pub farmer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_pay_premium(ctx: Context<PayPremium>, amount: u64) -> Result<()> {
    require!(amount > 0, ThaharError::PremiumTooLow);
    require!(
        ctx.accounts.policy.status == PolicyStatus::Active,
        ThaharError::PolicyNotActive
    );

    let cpi_accounts = Transfer {
        from: ctx.accounts.farmer.to_account_info(),
        to:   ctx.accounts.treasury.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.key(),
        cpi_accounts,
    );
    transfer(cpi_ctx, amount)?;

    let policy = &mut ctx.accounts.policy;
    policy.premium_paid = policy.premium_paid
        .checked_add(amount)
        .ok_or(ThaharError::ArithmeticOverflow)?;

    msg!("Premium paid: {} lamports. Total paid: {}", amount, policy.premium_paid);
    Ok(())
}
