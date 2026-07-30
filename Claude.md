\# 2027 IPP Automated Workflow - Project Initialization



\## Project Overview

This project aims to build an automated workflow for the 2027 Incentive Planning Process (IPP) to eliminate manual back-and-forth communication. The automated system will streamline operations by introducing chat webhooks, a web-based progress tracker, and automated status notifications (emails/chats) when data or decisions become available. 



\---



\## Strategic Context \& Business Rules

The automated workflow must enforce the core design principles established by the IPP Core Working Team for the 2027 fiscal year. The system's logic and tracking metrics should reflect the following strategic shifts:



\*   \*\*Compensation Principles\*\*: The plan is designed to drive strategic behavior change, keep compensation simple and predictable, and address the current disconnect between sales performance and P\&L results\[cite: 2].

\*   \*\*Targeting \& Metrics\*\*: The workflow will need to track Net Billings Retention (NBR) rather than explicit renewal targets, reflecting a heavier weighting on NBR versus Committed Annual Revenue (CAR)\[cite: 2].

\*   \*\*Specialist Incentives\*\*: The system must track newly created product-specific NBR targets for specialist roles (e.g., cyber security) to incentivize renewal support\[cite: 2].

\*   \*\*Deal Mechanics\*\*: Logic must be built to eliminate team targets in tech sales, moving away from complex structures where up to 17 people were paid on a single deal\[cite: 1, 2].

\*   \*\*Windfall Rules\*\*: The workflow requires predictable, automated tracking for large deals exceeding the $5 million Total Contract Value (TCV) threshold to eliminate manual compensation uncertainty\[cite: 2]. 

\*   \*\*Payment \& Timelines\*\*: The system should support new baseline commission payout timelines aligned with actual billing dates rather than contract signing dates to optimize cash flow\[cite: 1].

\*   \*\*System Feasibility\*\*: All commission and compensation logic built into the workflow must be cleanly calculable at the individual rep level\[cite: 1].



\---



\## Technical Architecture \& Features

To execute this automation, Claude Code should focus on building out the following core features:

\*   \*\*Web Portal\*\*: A centralized website featuring real-time progress trackers for IPP planning, target approvals, and milestone completion.

\*   \*\*Notification Engine\*\*: Automated email and chat alerts triggered when new data is available or when workflow stages change.

\*   \*\*Webhook Integrations\*\*: Chat webhooks (e.g., Slack/Google Chat) for seamless communication and alerts for deal approvals, target setting, and large-deal windfall thresholds.

\*   \*\*Data Ingestion\*\*: Ability to parse, clean, and map target figures, deal sizes, and hierarchical data to the correct rep and segment.



\---



\## Reference Workflows \& Codebase

To ensure architectural consistency, please review and use the following files as structural templates. These files contain already-built workflows that demonstrate our preferred data handling, webhook integrations, and UI tracking patterns:

\*   "G:\\Shared drives\\EPB Planning Drive\\1 - Consolidated\\11 - Claude Code Projects\\Projects\\Consolidated Billed Revenue\\apps-script\\Tracker.html"

\*   "G:\\Shared drives\\EPB Planning Drive\\1 - Consolidated\\11 - Claude Code Projects\\Projects\\Consolidated Billed Revenue\\tracker.bat"



\*Note to Claude: Mimic the coding style, error handling, and file structure found in the above references when building the 2027 IPP workflow.\*



\---



\## Data Sources \& References

The workflow will utilize the following reference files. Claude Code must reference these files to construct the database schema, team mapping, schedule logic, and risk registers:



\*   2027\_IPP\_Integrated\_Program\_Pl\_Governace\_Calendar.csv

\*   2027\_IPP\_Integrated\_Program\_Pl\_Program\_Team.csv

\*   2027\_IPP\_Integrated\_Program\_Pl\_R\_R.csv

\*   2027\_IPP\_Integrated\_Program\_Pl\_RAID\_Log.csv

\*   2027\_IPP\_Integrated\_Program\_Pl\_RAID\_Summary.csv

\*   2027\_IPP\_Integrated\_Program\_Pl\_Roles\_and\_Responsibilities.csv

\*   2027\_IPP\_Integrated\_Program\_Pl\_Sheet7.csv

\*   2027\_IPP\_Integrated\_Program\_Pl\_Workback\_Plan\_2025.csv

\*   2027\_IPP\_Integrated\_Program\_Pl\_Workback\_Plan\_2026.csv

\*   2027\_IPP\_Integrated\_Program\_Pl\_Workback\_Plan\_2026\_Initial.csv

\*   2027\_IPP\_Integrated\_Program\_Pl\_Workback\_Plan\_2026\_v2.csv

\*   2027\_IPP\_Integrated\_Program\_Pl\_Workback\_Plan\_2027\_July\_v1.csv



\---



\## Key Project Milestones

The automated workflow must be developed and deployed in alignment with the IPP workback schedule\[cite: 2]:



| Milestone | Target Date |

| :--- | :--- |

| \*\*Data Analysis Ready\*\* | August 13, 2026 |

| \*\*VP Leadership Review\*\* | August 20, 2026 |

| \*\*Final Decision\*\* | Week of August 27, 2026 |

| \*\*Incentives Team Ready\*\* | September 2026 |

| \*\*Implementation Deadline\*\* | Mid-December 2026 |

