# MAIAR Bounty Program Overview

## Introduction

Our **GitHub Action-Based Bounty Program** is designed to **reward contributors transparently, fairly, and efficiently** for their work in improving and expanding our project. This program leverages **automated workflows** to manage bounty payments seamlessly while maintaining high-quality standards.

## How the Bounty System Works

1. **Bounty Creation**

   - Core developers tag issues with the `bounty` label and specify a bounty amount in `$MAIAR`.
   - Only high-priority issues will receive assigned bounties.

2. **Request for Comments (RFC) Submission**

   - Contributors submit **detailed RFCs** outlining their implementation approach.
   - An **approved RFC is required** before starting work to prevent duplication.
   - If multiple developers submit RFCs, the best one will be selected.

3. **Development & Submission**

   - Approved contributors complete the implementation within the agreed timeline.
   - A **Pull Request (PR)** is submitted and reviewed by the core dev team.

4. **Quality Review & Approval**

   - The PR is evaluated based on **code quality, responsiveness, adherence to the RFC, and our [Contribution Guidelines](https://github.com/UraniumCorporation/maiar-ai/blob/main/.github/CONTRIBUTING.md)**.
   - Developers who submit low-quality work or fail to make honest efforts may be **banned from future bounties**.

5. **Bounty Payment Process**
   - The contributor comments with their **Solana wallet address** in the format:
     ```
     solana:<wallet-address>
     ```
   - Upon approval and merge of the PR, the **GitHub Action (GHA) workflow** is triggered, automatically processing the payment using the [**Uranium Corporation Solana Payout Action**](https://github.com/marketplace/actions/solana-payout-action) open sourced on GitHub.
   - The workflow comments on the PR with the **transaction signature** for confirmation.
   - The bounty issue(s) are then marked with the `bounty paid` label.

:::warning Use a Valid Solana Wallet
Please use a valid Solana wallet that supports token address creation to receive $MAIAR payments. We recommend using a non-custodial wallet like Phantom.

Wallets confirmed to work:

- Phantom

Wallets confirmed to not work:

- Bybit
  :::

## Contributor Guidelines

- **Issue Proposals**: Contributors can propose new issues, which the core team may assign a bounty to.

  - If an issue is approved for a bounty, the proposer gets **priority in submitting an RFC**.
  - Spamming low-quality issues will result in **submission restrictions**.

- **Timelines & Extensions**: Contributors must complete work within the assigned timeline.

  - If delays occur due to legitimate blockers, an extension **may** be granted.
  - Repeated delays without valid reasons will lead to a **ban from future participation**.

- **Code Review & Revisions**: Developers must be responsive to requested changes.
  - Failure to address feedback or submitting poor-quality work may lead to disqualification.

## Governance & Discretion

The **MAIAR Core Team** has sole discretion over:

- RFC approvals and bounty assignments
- Timeline extensions
- Contributor bans for repeated delays, poor quality, or dishonest practices

## Summary

The **MAIAR Bounty Program** is designed to foster **high-quality contributions**, provide **fair rewards**, and maintain **a streamlined development process**. By automating payments and maintaining strict quality control, we ensure a **transparent and efficient** experience for all contributors.

We look forward to growing the project together with our developer community!
