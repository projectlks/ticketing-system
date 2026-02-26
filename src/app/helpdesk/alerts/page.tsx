import ZabbixProblemsTable from "./ZabbixProblemsTable";

export default function AlertsPage() {
  // Alerts route entry ကို wrapper အနေနဲ့ထားပြီး
  // table + state logic ကို ZabbixProblemsTable မှာပဲ စုထားပါတယ်။
  return <ZabbixProblemsTable />;
}
