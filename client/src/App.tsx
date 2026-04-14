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
import Notes from "./pages/Notes";
import Settings from "./pages/Settings";

function Router() {
  return (
    <SalesLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/meetings" component={Meetings} />
        <Route path="/meetings/new" component={NewMeeting} />
        <Route path="/meetings/:id" component={MeetingDetail} />
        <Route path="/analysis" component={Analysis} />
        <Route path="/spiced" component={SpicedReports} />
        <Route path="/meddpicc" component={MeddpiccReports} />
        <Route path="/actions" component={ActionItems} />
        <Route path="/timeline" component={DealTimeline} />
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
