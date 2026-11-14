import { StoreProvider, useStore } from "./store/StoreContext";
import Layout from "./components/Layout";
import Dashboard from "./modules/Dashboard";
import POSTerminal from "./modules/POSTerminal";
import Inventory from "./modules/Inventory";
import Exchange from "./modules/Exchange";
import CRM from "./modules/CRM";
import Suppliers from "./modules/Suppliers";
import Accounting from "./modules/Accounting";
import Staff from "./modules/Staff";

function ModuleView() {
  const { activeModule, role } = useStore();
  const managerOnly = ["dashboard", "crm", "suppliers", "accounting"];
  if (role === "Cashier" && managerOnly.includes(activeModule)) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <p className="font-display font-extrabold text-lg text-slate-900">Restricted Area</p>
        <p className="text-sm text-slate-500 mt-2">Cashiers cannot access this module. Switch role to Owner or Store Manager in the top bar to continue testing.</p>
      </div>
    );
  }
  switch (activeModule) {
    case "dashboard": return <Dashboard />;
    case "pos": return <POSTerminal />;
    case "inventory": return <Inventory />;
    case "exchange": return <Exchange />;
    case "crm": return <CRM />;
    case "suppliers": return <Suppliers />;
    case "accounting": return <Accounting />;
    case "staff": return <Staff />;
    default: return <Dashboard />;
  }
}

export default function App() {
  return (
    <StoreProvider>
      <Layout>
        <ModuleView />
      </Layout>
    </StoreProvider>
  );
}
