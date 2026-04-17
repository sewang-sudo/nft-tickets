use anchor_lang::prelude::*;
use crate::state::InsurancePolicy;

#[derive(Accounts)]
pub struct ClosePolicy<'info> {
    #[account(
        mut,
        close = farmer,
        seeds = [b"policy", farmer.key().as_ref()],
        bump = policy.bump,
        has_one = farmer,
    )]
    pub policy: Account<'info, InsurancePolicy>,
    #[account(mut)]
    pub farmer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClosePolicy>) -> Result<()> {
    msg!("Policy closed for farmer: {:?}", ctx.accounts.farmer.key());
    Ok(())
}
