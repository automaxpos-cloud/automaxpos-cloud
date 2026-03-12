# JP Max Admin Portal (Internal)

## Terminology
- Platform owner/operator: **JP Max Technologies**
- Customer: **Business Owner**
- Customer portal: **Hosted Dashboard**
- Internal platform portal: **JP Max Admin Portal**
- Product internal area: **AutoMax POS Control Panel**

## Internal Portal Structure
- JP Max Admin Portal
  - AutoMax POS Control Panel
  - (future product control panels)
    - AutoMax ERP Control Panel
    - AutoMax Smart Teacher Control Panel
    - EduMax Control Panel
    - VirtualMax Control Panel
    - SignalMax Control Panel
    - SolarMax Control Panel
    - ConnectMax Control Panel

## Hosted Route Structure (Target)
- /dashboard
  - Hosted Dashboard (Business Owners)
- /jpmax-admin
  - JP Max Admin Portal (internal)
- /jpmax-admin/automax-pos
  - AutoMax POS Control Panel
- /jpmax-admin/automax-pos/requests
  - License Requests
- /jpmax-admin/automax-pos/issued
  - Issued Licenses
- /jpmax-admin/automax-pos/licenses
  - Manual License Manager
- /jpmax-admin/automax-pos/businesses
- /jpmax-admin/automax-pos/backends
- /jpmax-admin/automax-pos/sync
- /jpmax-admin/settings

## JP Max Admin Portal Capabilities
- Product overview
- Control panel access by product
- Internal admin users
- Roles/permissions
- Platform settings
- Audit logs

## AutoMax POS Control Panel Capabilities
- Overview
- Business Owners / businesses
- Branches
- Backend registrations
- Licenses
- Manual License Manager
- Sync monitoring
- Support tools
- Logs
- Product settings

## Role Model (Internal)
- Super Admin
  - full access to JP Max Admin Portal and all control panels
- Licensing Admin
  - license issuance, renewals, revocations, device limits
- Support Admin
  - monitoring, diagnostics, backend status, sync health

Business Owners must never access JP Max Admin Portal.

## Shipping Separation
- Production customer install ships only:
  - POS Client / APK
  - AutoMax Backend
  - Hosted Dashboard access
- JP Max Admin Portal is internal and hosted only.
- Local Dashboard Pack and Vendor Admin Pack are optional/internal tools.
