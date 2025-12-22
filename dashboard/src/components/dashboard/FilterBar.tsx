'use client';

import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  InputAdornment,
  SelectChangeEvent,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Server } from '@/types';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  serverFilter: string;
  onServerFilterChange: (server: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  servers: Pick<Server, 'id' | 'name'>[];
  onRefresh: () => void;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  serverFilter,
  onServerFilterChange,
  statusFilter,
  onStatusFilterChange,
  servers,
  onRefresh,
}: FilterBarProps) {
  const handleServerChange = (event: SelectChangeEvent) => {
    onServerFilterChange(event.target.value);
  };

  const handleStatusChange = (event: SelectChangeEvent) => {
    onStatusFilterChange(event.target.value);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
        mb: 3,
        p: 2,
        bgcolor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(30, 41, 59, 0.6)'
            : 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(12px)',
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
      }}
    >
      {/* Search */}
      <TextField
        placeholder="Search workflows..."
        size="small"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ flexGrow: 1, minWidth: 200 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            </InputAdornment>
          ),
        }}
      />

      {/* Server Filter */}
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel id="server-filter-label">Server</InputLabel>
        <Select
          labelId="server-filter-label"
          id="server-filter"
          value={serverFilter}
          label="Server"
          onChange={handleServerChange}
        >
          <MenuItem value="all">All Servers</MenuItem>
          {servers.map((server) => (
            <MenuItem key={server.id} value={server.id}>
              {server.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Status Filter */}
      <FormControl size="small" sx={{ minWidth: 130 }}>
        <InputLabel id="status-filter-label">Status</InputLabel>
        <Select
          labelId="status-filter-label"
          id="status-filter"
          value={statusFilter}
          label="Status"
          onChange={handleStatusChange}
        >
          <MenuItem value="all">All Status</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
          <MenuItem value="running">Running</MenuItem>
          <MenuItem value="failed">Failed</MenuItem>
        </Select>
      </FormControl>

      {/* Refresh Button */}
      <IconButton
        onClick={onRefresh}
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: (theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(59, 130, 246, 0.1)'
              : 'rgba(59, 130, 246, 0.08)',
          color: 'primary.main',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            bgcolor: (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(59, 130, 246, 0.2)'
                : 'rgba(59, 130, 246, 0.15)',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
          },
        }}
        aria-label="Refresh data"
      >
        <RefreshIcon />
      </IconButton>
    </Box>
  );
}
