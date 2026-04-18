use anchor_lang::prelude::*;
use crate::state::InsurancePolicy;

#[derive(Accounts)]
pub struct ClosePolicy<'info> {
    #[account(
        mut,
        seeds = [b"policy", farmer.key().as_ref()],
        bump = policy.bump,
        has_one = farmer,
    )]
    pub policy: Account<'info, InsurancePolicy>,
    #[account(mut)]
    pub farmer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_close_policy(ctx: Context<ClosePolicy>) -> Result<()> {
    let policy = &ctx.accounts.policy;
    let farmer = &ctx.accounts.farmer;

    // Transfer all lamports from policy account to farmer
    let policy_lamports = policy.to_account_info().lamports();
    **policy.to_account_info().try_borrow_mut_lamports()? -= policy_lamports;
    **farmer.to_account_info().try_borrow_mut_lamports()? += policy_lamports;

    // Zero out the account data so it's reclaimed
    policy.to_account_info().data.borrow_mut().fill(0);

    msg!("Policy closed for farmer: {:?}", farmer.key());
    Ok(())
}
