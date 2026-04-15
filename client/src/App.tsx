import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import SalesLayout from "./components/SalesLayout";
import Dashboard from "./pages/Dashboard";
import Meetings from "./pages/Meetings";
import NewMeeting from "./pages/NewMeeting";
import MeetingDetail from "./pages/MeetingDetail";
import Analysis from "./pages/Analysis";
import SpicedReports from "./pages/SpicedReports";
import MeddpiccReports from "./pages/MeddpiccReports";
import ActionItems from "./pages/ActionItems";
import DealTimeline from "./pages/DealTimeline";
import Accounts from "./pages/Accounts";
import DealSummaryPage from "./pages/DealSummary";
import Notes from "./pages/Notes";
import Settings from "./pages/Settings";
import Analyze from "./pages/Analyze";
import EmailGenerator from "./pages/EmailGenerator";
import ProspectQueue from "./pages/ProspectQueue";
import DeckGenerator from "./pages/DeckGenerator";
import Battlecards from "./pages/Battlecards";
import ObjectionLibrary from "./pages/ObjectionLibrary";

function Router() {
  return (
    <SalesLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        {/* Meetings */}
        <Route path="/meetings" component={Meetings} />
        <Route path="/meetings/new" component={NewMeeting} />
        <Route path="/meetings/:id" component={MeetingDetail} />
        {/* AI Analysis */}
        <Route path="/analyze" component={Analyze} />
        <Route path="/analysis" component={Analysis} />
        <Route path="/spiced" component={SpicedReports} />
        <Route path="/meddpicc" component={MeddpiccReports} />
        {/* Sales Tools */}
        <Route path="/email" component={EmailGenerator} />
        <Route path="/prospects" component={ProspectQueue} />
        <Route path="/deck" component={DeckGenerator} />
        {/* Intelligence */}
        <Route path="/battlecards" component={Battlecards} />
        <Route path="/objections" component={ObjectionLibrary} />
        {/* Workflow */}
        <Route path="/actions" component={ActionItems} />
        <Route path="/timeline" component={DealTimeline} />
        {/* Accounts & Deal Threads */}
        <Route path="/accounts" component={Accounts} />
        <Route path="/accounts/:accountId" component={DealSummaryPage} />
        <Route path="/notes" component={Notes} />
        <Route path="/settings" component={Settings} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </SalesLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
