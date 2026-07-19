/* eslint-disable */
// @ts-nocheck
// Generated route tree. Do not edit manually; TanStack Router may overwrite it.

import { Route as rootRouteImport } from './routes/__root'
import { Route as SitemapDotxmlRouteImport } from './routes/sitemap[.]xml'
import { Route as ScanRouteImport } from './routes/scan'
import { Route as CashierRouteImport } from './routes/cashier'
import { Route as AuthRouteImport } from './routes/auth'
import { Route as AdminRouteImport } from './routes/admin'
import { Route as IndexRouteImport } from './routes/index'
import { Route as PlatformAuthRouteImport } from './routes/platform-auth'
import { Route as PlatformRouteImport } from './routes/platform'
import { Route as PlatformIndexRouteImport } from './routes/platform.index'
import { Route as PlatformCompaniesRouteImport } from './routes/platform.companies'
import { Route as PlatformSupportRouteImport } from './routes/platform.support'
import { Route as PlatformSupportCaseIdRouteImport } from './routes/platform.support.$caseId'
import { Route as PlatformUsersRouteImport } from './routes/platform.users'
import { Route as PlatformSettingsRouteImport } from './routes/platform.settings'
import { Route as AdminCustomerSuccessRouteImport } from './routes/admin.customer-success'
import { Route as AdminCustomerSuccessCaseIdRouteImport } from './routes/admin.customer-success.$caseId'
import { Route as CashierIndexRouteImport } from './routes/cashier.index'
import { Route as AdminIndexRouteImport } from './routes/admin.index'
import { Route as CashierSellCouponRouteImport } from './routes/cashier.sell-coupon'
import { Route as AdminSubscriptionsRouteImport } from './routes/admin.subscriptions'
import { Route as AdminSellCouponRouteImport } from './routes/admin.sell-coupon'
import { Route as AdminPlansRouteImport } from './routes/admin.plans'
import { Route as AdminDrinksRouteImport } from './routes/admin.drinks'
import { Route as AdminCouponsRouteImport } from './routes/admin.coupons'
import { Route as AdminCashiersRouteImport } from './routes/admin.cashiers'
import { Route as AdminBranchesRouteImport } from './routes/admin.branches'
import { Route as AdminFinancialReportsRouteImport } from './routes/admin.financial-reports'

const SitemapDotxmlRoute = SitemapDotxmlRouteImport.update({ id: '/sitemap.xml', path: '/sitemap.xml', getParentRoute: () => rootRouteImport } as any)
const ScanRoute = ScanRouteImport.update({ id: '/scan', path: '/scan', getParentRoute: () => rootRouteImport } as any)
const CashierRoute = CashierRouteImport.update({ id: '/cashier', path: '/cashier', getParentRoute: () => rootRouteImport } as any)
const AuthRoute = AuthRouteImport.update({ id: '/auth', path: '/auth', getParentRoute: () => rootRouteImport } as any)
const AdminRoute = AdminRouteImport.update({ id: '/admin', path: '/admin', getParentRoute: () => rootRouteImport } as any)
const IndexRoute = IndexRouteImport.update({ id: '/', path: '/', getParentRoute: () => rootRouteImport } as any)
const PlatformAuthRoute = PlatformAuthRouteImport.update({ id: '/platform-auth', path: '/platform-auth', getParentRoute: () => rootRouteImport } as any)
const PlatformRoute = PlatformRouteImport.update({ id: '/platform', path: '/platform', getParentRoute: () => rootRouteImport } as any)

const PlatformIndexRoute = PlatformIndexRouteImport.update({ id: '/', path: '/', getParentRoute: () => PlatformRoute } as any)
const PlatformCompaniesRoute = PlatformCompaniesRouteImport.update({ id: '/companies', path: '/companies', getParentRoute: () => PlatformRoute } as any)
const PlatformSupportRoute = PlatformSupportRouteImport.update({ id: '/support', path: '/support', getParentRoute: () => PlatformRoute } as any)
const PlatformSupportCaseIdRoute = PlatformSupportCaseIdRouteImport.update({ id: '/support/$caseId', path: '/support/$caseId', getParentRoute: () => PlatformRoute } as any)
const PlatformUsersRoute = PlatformUsersRouteImport.update({ id: '/users', path: '/users', getParentRoute: () => PlatformRoute } as any)
const PlatformSettingsRoute = PlatformSettingsRouteImport.update({ id: '/settings', path: '/settings', getParentRoute: () => PlatformRoute } as any)

const AdminCustomerSuccessRoute = AdminCustomerSuccessRouteImport.update({ id: '/customer-success', path: '/customer-success', getParentRoute: () => AdminRoute } as any)
const AdminCustomerSuccessCaseIdRoute = AdminCustomerSuccessCaseIdRouteImport.update({ id: '/customer-success/$caseId', path: '/customer-success/$caseId', getParentRoute: () => AdminRoute } as any)
const CashierIndexRoute = CashierIndexRouteImport.update({ id: '/', path: '/', getParentRoute: () => CashierRoute } as any)
const AdminIndexRoute = AdminIndexRouteImport.update({ id: '/', path: '/', getParentRoute: () => AdminRoute } as any)
const CashierSellCouponRoute = CashierSellCouponRouteImport.update({ id: '/sell-coupon', path: '/sell-coupon', getParentRoute: () => CashierRoute } as any)
const AdminSubscriptionsRoute = AdminSubscriptionsRouteImport.update({ id: '/subscriptions', path: '/subscriptions', getParentRoute: () => AdminRoute } as any)
const AdminSellCouponRoute = AdminSellCouponRouteImport.update({ id: '/sell-coupon', path: '/sell-coupon', getParentRoute: () => AdminRoute } as any)
const AdminPlansRoute = AdminPlansRouteImport.update({ id: '/plans', path: '/plans', getParentRoute: () => AdminRoute } as any)
const AdminDrinksRoute = AdminDrinksRouteImport.update({ id: '/drinks', path: '/drinks', getParentRoute: () => AdminRoute } as any)
const AdminCouponsRoute = AdminCouponsRouteImport.update({ id: '/coupons', path: '/coupons', getParentRoute: () => AdminRoute } as any)
const AdminCashiersRoute = AdminCashiersRouteImport.update({ id: '/cashiers', path: '/cashiers', getParentRoute: () => AdminRoute } as any)
const AdminBranchesRoute = AdminBranchesRouteImport.update({ id: '/branches', path: '/branches', getParentRoute: () => AdminRoute } as any)
const AdminFinancialReportsRoute = AdminFinancialReportsRouteImport.update({ id: '/financial-reports', path: '/financial-reports', getParentRoute: () => AdminRoute } as any)

const PlatformRouteWithChildren = PlatformRoute._addFileChildren({
  PlatformIndexRoute,
  PlatformCompaniesRoute,
  PlatformSupportRoute,
  PlatformSupportCaseIdRoute,
  PlatformUsersRoute,
  PlatformSettingsRoute,
})

const AdminRouteWithChildren = AdminRoute._addFileChildren({
  AdminBranchesRoute,
  AdminCashiersRoute,
  AdminCouponsRoute,
  AdminDrinksRoute,
  AdminFinancialReportsRoute,
  AdminPlansRoute,
  AdminSellCouponRoute,
  AdminSubscriptionsRoute,
  AdminCustomerSuccessRoute,
  AdminCustomerSuccessCaseIdRoute,
  AdminIndexRoute,
})

const CashierRouteWithChildren = CashierRoute._addFileChildren({
  CashierSellCouponRoute,
  CashierIndexRoute,
})

export const routeTree = rootRouteImport._addFileChildren({
  IndexRoute,
  PlatformAuthRoute,
  PlatformRoute: PlatformRouteWithChildren,
  AdminRoute: AdminRouteWithChildren,
  AuthRoute,
  CashierRoute: CashierRouteWithChildren,
  ScanRoute,
  SitemapDotxmlRoute,
})

import type { getRouter } from './router.tsx'
import type { startInstance } from './start.ts'
declare module '@tanstack/react-start' {
  interface Register {
    ssr: true
    router: Awaited<ReturnType<typeof getRouter>>
    config: Awaited<ReturnType<typeof startInstance.getOptions>>
  }
}
