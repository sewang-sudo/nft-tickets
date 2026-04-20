use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(region_id: String)]
pub struct CloseOracle<'info> {
    #[account(
        mut,
        seeds = [b"oracle", region_id.as_bytes()],
        bump,
    )]
    /// CHECK: closing this account, no need to deserialize
    pub oracle: UncheckedAccount<'info>,
    #[account(mut)]
    pub caller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_close_oracle(
    ctx: Context<CloseOracle>,
    _region_id: String,
) -> Result<()> {
    let oracle = &ctx.accounts.oracle;
    let caller = &ctx.accounts.caller;
    
    let lamports = oracle.lamports();
    **oracle.try_borrow_mut_lamports()? -= lamports;
    **caller.try_borrow_mut_lamports()? += lamports;
    
    msg!("Oracle account force closed");
    Ok(())
}