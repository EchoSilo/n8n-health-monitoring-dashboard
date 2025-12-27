'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Collapse,
  Tabs,
  Tab,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Divider,
  LinearProgress,
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import SpeedIcon from '@mui/icons-material/Speed';
import BuildIcon from '@mui/icons-material/Build';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {
  useRCA,
  useRunRCA,
  RCAData,
  RCADepth,
  WhyStep,
  SafetyNetGap,
  Recommendation,
  getConfidenceLevel,
  getDepthDescription,
} from '@/hooks/api/use-rca';

interface RCASectionProps {
  errorId: string;
  useMockData?: boolean;
}

// Mock RCA data for demo mode
const mockRCAData: RCAData = {
  id: 'rca-mock-001',
  errorId: 'err-001',
  fiveWhys: {
    symptom: 'HTTP Request Timeout: Connection to api.example.com timed out after 30000ms',
    whys: [
      {
        question: 'Why did the HTTP request time out?',
        answer: 'The API server took longer than 30 seconds to respond',
        evidence: 'Timeout occurred at 30,000ms, the default timeout setting',
      },
      {
        question: 'Why did the API server take so long to respond?',
        answer: 'The API was processing a large dataset query without pagination',
        evidence: 'Request was fetching all 15,000 records in a single call',
      },
      {
        question: 'Why was pagination not implemented?',
        answer: 'The original implementation assumed the dataset would remain small',
        evidence: 'Workflow was created 6 months ago when dataset had ~500 records',
      },
      {
        question: 'Why was there no monitoring for dataset growth?',
        answer: 'No alerting was set up for data volume thresholds',
        evidence: 'No data volume monitoring exists in current workflow',
      },
    ],
    rootCause: 'Missing pagination and data volume monitoring led to unbounded query as dataset grew from 500 to 15,000 records over 6 months.',
  },
  gapAnalysis: {
    safetyNets: [
      { name: 'Pagination', existed: false, whyMissed: 'Not implemented in original design' },
      { name: 'Request Timeout Handling', existed: false, whyMissed: 'No retry logic or fallback' },
      { name: 'Data Volume Monitoring', existed: false, whyMissed: 'Growth not anticipated' },
      { name: 'Performance Testing', existed: true, whyMissed: 'Only tested with small datasets' },
    ],
  },
  recommendations: {
    quickWins: [
      {
        title: 'Increase timeout to 60 seconds',
        description: 'Immediate fix to prevent failures while implementing proper pagination',
        effort: 'quick_win',
        priority: 1,
      },
      {
        title: 'Add retry with exponential backoff',
        description: 'Use n8n\'s built-in retry settings with 3 attempts',
        effort: 'quick_win',
        priority: 2,
      },
    ],
    mediumTerm: [
      {
        title: 'Implement pagination',
        description: 'Add limit/offset or cursor-based pagination to fetch data in batches of 100',
        effort: 'medium_term',
        nodeChanges: ['HTTP Request node configuration'],
        priority: 1,
      },
      {
        title: 'Add SplitInBatches node',
        description: 'Process records in chunks to avoid memory issues',
        effort: 'medium_term',
        priority: 2,
      },
    ],
    longTerm: [
      {
        title: 'Set up data volume monitoring',
        description: 'Create a scheduled workflow that monitors dataset size and alerts when thresholds are exceeded',
        effort: 'long_term',
        priority: 1,
      },
      {
        title: 'Implement caching layer',
        description: 'Cache frequently accessed data to reduce API load',
        effort: 'long_term',
        priority: 2,
      },
    ],
  },
  errorCategory: 'Connection',
  errorPattern: 'ETIMEDOUT',
  confidence: 85,
  dataSource: 'live',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  skillsUsed: ['SKILL', 'FIVE_WHYS', 'ERROR_CATALOG'],
  tokenUsage: 2500,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function RCASection({ errorId, useMockData = false }: RCASectionProps) {
  const { data: rcaData, isLoading: isFetching } = useRCA(useMockData ? null : errorId);
  const runRCA = useRunRCA();
  const [showMock, setShowMock] = useState(false);
  const [selectedDepth, setSelectedDepth] = useState<RCADepth>('standard');
  const [isExpanded, setIsExpanded] = useState(true);
  const [mutationResult, setMutationResult] = useState<RCAData | null>(null);

  // For demo mode, use mock data; for API mode, prefer mutation result over cached query data
  const displayData = useMockData ? (showMock ? mockRCAData : null) : (mutationResult || rcaData);

  const handleRunRCA = async (forceRefresh = false) => {
    if (useMockData) {
      setShowMock(true);
      return;
    }
    const result = await runRCA.mutateAsync({
      errorId,
      depth: selectedDepth,
      forceRefresh,
    });
    setMutationResult(result);
  };

  const isLoading = runRCA.isPending || isFetching;

  return (
    <Card
      sx={{
        bgcolor: 'rgba(99, 102, 241, 0.04)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        mb: 2,
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: displayData ? 2 : 0,
            cursor: 'pointer',
          }}
          onClick={() => displayData && setIsExpanded(!isExpanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PsychologyIcon sx={{ color: '#6366f1', fontSize: 20 }} />
            <Typography variant="subtitle2" fontWeight={600}>
              Root Cause Analysis (5 Whys)
            </Typography>
            {displayData && (
              <Chip
                size="small"
                label={`${displayData.confidence}% Confidence`}
                color={getConfidenceLevel(displayData.confidence).color}
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
            )}
          </Box>

          {displayData ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Re-run analysis">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRunRCA(true);
                  }}
                  disabled={isLoading}
                >
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              {isExpanded ? (
                <ExpandLessIcon sx={{ fontSize: 18 }} />
              ) : (
                <ExpandMoreIcon sx={{ fontSize: 18 }} />
              )}
            </Box>
          ) : null}
        </Box>

        {/* No analysis yet - show run button */}
        {!displayData && !isLoading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Run AI-powered root cause analysis using the 5 Whys methodology.
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {(['quick', 'standard', 'deep'] as RCADepth[]).map((depth) => (
                <Chip
                  key={depth}
                  label={depth.charAt(0).toUpperCase() + depth.slice(1)}
                  variant={selectedDepth === depth ? 'filled' : 'outlined'}
                  color={selectedDepth === depth ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setSelectedDepth(depth)}
                  sx={{ textTransform: 'capitalize' }}
                />
              ))}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {getDepthDescription(selectedDepth)}
            </Typography>

            <Button
              variant="contained"
              size="small"
              startIcon={<PsychologyIcon />}
              onClick={() => handleRunRCA()}
              disabled={isLoading}
              sx={{
                bgcolor: '#6366f1',
                '&:hover': { bgcolor: '#4f46e5' },
              }}
            >
              Run 5 Whys Analysis
            </Button>
          </Box>
        )}

        {/* Loading state */}
        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Analyzing error with 5 Whys methodology...
            </Typography>
          </Box>
        )}

        {/* Error state */}
        {runRCA.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {runRCA.error instanceof Error ? runRCA.error.message : 'Failed to run RCA'}
          </Alert>
        )}

        {/* RCA Results */}
        <Collapse in={isExpanded && !!displayData}>
          {displayData && <RCAResults data={displayData} />}
        </Collapse>
      </CardContent>
    </Card>
  );
}

// Import IconButton at the top
import IconButton from '@mui/material/IconButton';

function RCAResults({ data }: { data: RCAData }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box>
      {/* Error Classification */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Chip
          size="small"
          label={data.errorCategory}
          color="error"
          variant="outlined"
          sx={{ fontSize: '0.7rem' }}
        />
        <Chip
          size="small"
          label={data.errorPattern}
          sx={{ fontSize: '0.7rem', bgcolor: 'rgba(255,255,255,0.05)' }}
        />
        <Chip
          size="small"
          label={`Data: ${data.dataSource}`}
          sx={{ fontSize: '0.7rem', bgcolor: 'rgba(255,255,255,0.05)' }}
        />
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          icon={<AccountTreeIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          label="5 Whys"
          sx={{ minHeight: 40, fontSize: '0.75rem' }}
        />
        <Tab
          icon={<WarningAmberIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          label="Gaps"
          sx={{ minHeight: 40, fontSize: '0.75rem' }}
        />
        <Tab
          icon={<LightbulbIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          label="Fixes"
          sx={{ minHeight: 40, fontSize: '0.75rem' }}
        />
      </Tabs>

      {/* Tab Content */}
      <Box sx={{ minHeight: 200 }}>
        {activeTab === 0 && <FiveWhysTab fiveWhys={data.fiveWhys} />}
        {activeTab === 1 && <GapAnalysisTab gaps={data.gapAnalysis.safetyNets} />}
        {activeTab === 2 && <RecommendationsTab recommendations={data.recommendations} />}
      </Box>
    </Box>
  );
}

function FiveWhysTab({ fiveWhys }: { fiveWhys: RCAData['fiveWhys'] }) {
  return (
    <Box>
      {/* Symptom */}
      <Box
        sx={{
          p: 1.5,
          mb: 2,
          bgcolor: 'rgba(239, 68, 68, 0.1)',
          borderRadius: 1,
          borderLeft: '3px solid #ef4444',
        }}
      >
        <Typography variant="caption" color="error" fontWeight={600}>
          SYMPTOM
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {fiveWhys.symptom}
        </Typography>
      </Box>

      {/* Why Chain */}
      <Box sx={{ position: 'relative', pl: 3 }}>
        {/* Vertical line */}
        <Box
          sx={{
            position: 'absolute',
            left: 10,
            top: 0,
            bottom: 60,
            width: 2,
            bgcolor: 'rgba(99, 102, 241, 0.3)',
          }}
        />

        {fiveWhys.whys.map((why, index) => (
          <Box key={index} sx={{ position: 'relative', mb: 2 }}>
            {/* Circle marker */}
            <Box
              sx={{
                position: 'absolute',
                left: -24,
                top: 0,
                width: 18,
                height: 18,
                borderRadius: '50%',
                bgcolor: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 600,
                color: 'white',
              }}
            >
              {index + 1}
            </Box>

            <Box
              sx={{
                p: 1.5,
                bgcolor: 'rgba(99, 102, 241, 0.08)',
                borderRadius: 1,
              }}
            >
              <Typography variant="caption" color="primary" fontWeight={600}>
                {why.question}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {why.answer}
              </Typography>
              {why.evidence && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}
                >
                  Evidence: {why.evidence}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>

      {/* Root Cause */}
      <Box
        sx={{
          p: 1.5,
          mt: 2,
          bgcolor: 'rgba(34, 197, 94, 0.1)',
          borderRadius: 1,
          borderLeft: '3px solid #22c55e',
        }}
      >
        <Typography variant="caption" color="success.main" fontWeight={600}>
          ROOT CAUSE
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {fiveWhys.rootCause}
        </Typography>
      </Box>
    </Box>
  );
}

function GapAnalysisTab({ gaps }: { gaps: SafetyNetGap[] }) {
  return (
    <List dense disablePadding>
      {gaps.map((gap, index) => (
        <ListItem
          key={index}
          sx={{
            px: 1.5,
            py: 1,
            mb: 1,
            bgcolor: gap.existed ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            borderRadius: 1,
            borderLeft: `3px solid ${gap.existed ? '#22c55e' : '#ef4444'}`,
          }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            {gap.existed ? (
              <CheckCircleIcon sx={{ fontSize: 18, color: '#22c55e' }} />
            ) : (
              <CancelIcon sx={{ fontSize: 18, color: '#ef4444' }} />
            )}
          </ListItemIcon>
          <ListItemText
            primary={gap.name}
            secondary={gap.whyMissed}
            primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </ListItem>
      ))}
    </List>
  );
}

function RecommendationsTab({
  recommendations,
}: {
  recommendations: RCAData['recommendations'];
}) {
  const [subTab, setSubTab] = useState(0);

  const tabConfig = [
    { label: 'Quick Wins', icon: <SpeedIcon />, items: recommendations.quickWins, color: '#22c55e' },
    { label: 'Medium', icon: <BuildIcon />, items: recommendations.mediumTerm, color: '#f59e0b' },
    { label: 'Long-term', icon: <TrendingUpIcon />, items: recommendations.longTerm, color: '#6366f1' },
  ];

  return (
    <Box>
      {/* Sub-tabs */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        {tabConfig.map((tab, index) => (
          <Chip
            key={index}
            icon={tab.icon}
            label={`${tab.label} (${tab.items.length})`}
            variant={subTab === index ? 'filled' : 'outlined'}
            onClick={() => setSubTab(index)}
            size="small"
            sx={{
              bgcolor: subTab === index ? `${tab.color}20` : 'transparent',
              borderColor: tab.color,
              color: subTab === index ? tab.color : 'text.secondary',
              '& .MuiChip-icon': { color: tab.color },
            }}
          />
        ))}
      </Box>

      {/* Recommendations list */}
      <List dense disablePadding>
        {tabConfig[subTab].items.map((rec, index) => (
          <ListItem
            key={index}
            sx={{
              px: 1.5,
              py: 1,
              mb: 1,
              bgcolor: 'rgba(255,255,255,0.02)',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {rec.title}
                  </Typography>
                  <Chip
                    size="small"
                    label={`P${rec.priority}`}
                    sx={{
                      height: 16,
                      fontSize: '0.6rem',
                      bgcolor: rec.priority === 1 ? 'error.main' : 'text.disabled',
                    }}
                  />
                </Box>
              }
              secondary={
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {rec.description}
                  </Typography>
                  {rec.nodeChanges && rec.nodeChanges.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                      {rec.nodeChanges.map((node, i) => (
                        <Chip
                          key={i}
                          size="small"
                          label={node}
                          sx={{ height: 16, fontSize: '0.55rem' }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              }
            />
          </ListItem>
        ))}

        {tabConfig[subTab].items.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No {tabConfig[subTab].label.toLowerCase()} recommendations
          </Typography>
        )}
      </List>
    </Box>
  );
}
