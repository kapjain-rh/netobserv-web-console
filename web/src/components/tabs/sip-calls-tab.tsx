import {
  Bullseye,
  ExpandableSection,
  Label,
  Spinner,
  Title
} from '@patternfly/react-core';
import {
  ExpandableRowContent,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr
} from '@patternfly/react-table';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Record as FlowRecord } from '../../api/ipfix';
import { groupFlowsBySipCallId, SipCall } from '../../model/sip';
import { getRtpPayloadDescription } from '../../utils/sip';

export interface SipCallsTabProps {
  flows: FlowRecord[];
  loading?: boolean;
  isDark?: boolean;
}

const statusColor = (status: string): 'green' | 'orange' | 'red' | 'blue' => {
  switch (status) {
    case 'completed':
      return 'green';
    case 'in-progress':
      return 'orange';
    case 'cancelled':
      return 'red';
    case 'registration':
      return 'blue';
    default:
      return 'orange';
  }
};

const formatDuration = (startMs: number, endMs: number): string => {
  if (!startMs || !endMs || endMs <= startMs) {
    return '-';
  }
  const ms = endMs - startMs;
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(0);
  return `${minutes}m ${remainingSeconds}s`;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatCallIdHash = (hash: number): string => {
  return `0x${hash.toString(16).toUpperCase().padStart(8, '0')}`;
};

export const SipCallsTab: React.FC<SipCallsTabProps> = ({ flows, loading, isDark }) => {
  const { t } = useTranslation('plugin__netobserv-plugin');
  const [expandedCalls, setExpandedCalls] = React.useState<Set<number>>(new Set());

  const sipCalls = React.useMemo(() => groupFlowsBySipCallId(flows), [flows]);

  const toggleExpand = (callIdHash: number) => {
    setExpandedCalls(prev => {
      const next = new Set(prev);
      if (next.has(callIdHash)) {
        next.delete(callIdHash);
      } else {
        next.add(callIdHash);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <Bullseye data-test="loading-sip-calls">
        <Spinner size="xl" />
      </Bullseye>
    );
  }

  if (sipCalls.length === 0) {
    return (
      <Bullseye data-test="no-sip-calls">
        <Title headingLevel="h2">{t('No SIP calls found')}</Title>
      </Bullseye>
    );
  }

  return (
    <div className={`sip-calls-tab ${isDark ? 'dark' : 'light'}`} data-test="sip-calls-tab">
      <Table variant="compact">
        <Thead>
          <Tr>
            <Th />
            <Th width={15}>{t('Call-ID Hash')}</Th>
            <Th width={10}>{t('Source')}</Th>
            <Th width={10}>{t('Destination')}</Th>
            <Th width={15}>{t('Methods')}</Th>
            <Th width={10}>{t('Status')}</Th>
            <Th width={10}>{t('Duration')}</Th>
            <Th width={10}>{t('Bytes')}</Th>
            <Th width={10}>{t('Packets')}</Th>
            <Th width={10}>{t('RTP Codec')}</Th>
          </Tr>
        </Thead>
        {sipCalls.map((call: SipCall) => {
          const isExpanded = expandedCalls.has(call.callIdHash);
          return (
            <Tbody key={call.callIdHash} isExpanded={isExpanded}>
              <Tr>
                <Td
                  expand={{
                    rowIndex: call.callIdHash,
                    isExpanded,
                    onToggle: () => toggleExpand(call.callIdHash)
                  }}
                />
                <Td dataLabel={t('Call-ID Hash')}>{formatCallIdHash(call.callIdHash)}</Td>
                <Td dataLabel={t('Source')}>
                  {call.srcAddr}
                  {call.srcPort ? `:${call.srcPort}` : ''}
                </Td>
                <Td dataLabel={t('Destination')}>
                  {call.dstAddr}
                  {call.dstPort ? `:${call.dstPort}` : ''}
                </Td>
                <Td dataLabel={t('Methods')}>
                  {call.methods.split(',').map(m => (
                    <Label key={m} isCompact className="sip-method-label">
                      {m.trim()}
                    </Label>
                  ))}
                </Td>
                <Td dataLabel={t('Status')}>
                  <Label color={statusColor(call.status)} isCompact>
                    {call.status}
                  </Label>
                </Td>
                <Td dataLabel={t('Duration')}>{formatDuration(call.startTime, call.endTime)}</Td>
                <Td dataLabel={t('Bytes')}>{formatBytes(call.totalBytes)}</Td>
                <Td dataLabel={t('Packets')}>{call.totalPackets}</Td>
                <Td dataLabel={t('RTP Codec')}>
                  {call.rtpStreams.length > 0
                    ? call.rtpStreams.map(s => getRtpPayloadDescription(s.payloadType)).join(', ')
                    : '-'}
                </Td>
              </Tr>
              <Tr isExpanded={isExpanded}>
                <Td colSpan={10}>
                  <ExpandableRowContent>
                    <SipCallDetail call={call} />
                  </ExpandableRowContent>
                </Td>
              </Tr>
            </Tbody>
          );
        })}
      </Table>
    </div>
  );
};

const SipCallDetail: React.FC<{ call: SipCall }> = ({ call }) => {
  const { t } = useTranslation('plugin__netobserv-plugin');

  return (
    <div className="sip-call-detail">
      {call.rtpStreams.length > 0 && (
        <ExpandableSection toggleText={t('RTP Streams')} isExpanded>
          <Table variant="compact">
            <Thead>
              <Tr>
                <Th>{t('SSRC')}</Th>
                <Th>{t('Codec')}</Th>
                <Th>{t('Bytes')}</Th>
                <Th>{t('Packets')}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {call.rtpStreams.map(stream => (
                <Tr key={stream.ssrc}>
                  <Td>{stream.ssrc}</Td>
                  <Td>{getRtpPayloadDescription(stream.payloadType)}</Td>
                  <Td>{formatBytes(stream.bytes)}</Td>
                  <Td>{stream.packets}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </ExpandableSection>
      )}
      <ExpandableSection toggleText={t('Individual Flows ({{count}})', { count: call.flows.length })} isExpanded>
        <Table variant="compact">
          <Thead>
            <Tr>
              <Th>{t('Source')}</Th>
              <Th>{t('Destination')}</Th>
              <Th>{t('SIP Method')}</Th>
              <Th>{t('Bytes')}</Th>
              <Th>{t('Packets')}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {call.flows.map((rec, idx) => (
              <Tr key={idx}>
                <Td>
                  {rec.fields.SrcAddr}
                  {rec.fields.SrcPort ? `:${rec.fields.SrcPort}` : ''}
                </Td>
                <Td>
                  {rec.fields.DstAddr}
                  {rec.fields.DstPort ? `:${rec.fields.DstPort}` : ''}
                </Td>
                <Td>{rec.fields.SipMethod || '-'}</Td>
                <Td>{formatBytes(rec.fields.Bytes || 0)}</Td>
                <Td>{rec.fields.Packets || 0}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </ExpandableSection>
    </div>
  );
};

export default SipCallsTab;
