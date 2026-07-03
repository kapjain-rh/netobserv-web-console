import { Record as FlowRecord } from '../api/ipfix';
import { sipCallStatus, SipCallStatus } from '../utils/sip';

export interface RtpStream {
  payloadType: string;
  ssrc: string;
  bytes: number;
  packets: number;
}

export interface SipCall {
  callIdHash: number;
  methods: string;
  status: SipCallStatus;
  flows: FlowRecord[];
  srcAddr: string;
  dstAddr: string;
  srcPort: number;
  dstPort: number;
  startTime: number;
  endTime: number;
  totalBytes: number;
  totalPackets: number;
  rtpStreams: RtpStream[];
}

export const groupFlowsBySipCallId = (records: FlowRecord[]): SipCall[] => {
  const callMap = new Map<number, FlowRecord[]>();

  for (const rec of records) {
    const flow = rec.fields;
    const hash = flow.SipCallIdHash;
    if (hash === undefined || hash === 0) {
      continue;
    }
    const existing = callMap.get(hash);
    if (existing) {
      existing.push(rec);
    } else {
      callMap.set(hash, [rec]);
    }
  }

  const calls: SipCall[] = [];
  callMap.forEach((flows, hash) => {
    const methodSet = new Set<string>();
    const rtpMap = new Map<string, RtpStream>();
    let srcAddr = '';
    let dstAddr = '';
    let srcPort = 0;
    let dstPort = 0;
    let startTime = Infinity;
    let endTime = 0;
    let totalBytes = 0;
    let totalPackets = 0;

    for (const rec of flows) {
      const f = rec.fields;
      if (f.SipMethod) {
        f.SipMethod.split(',').forEach(m => methodSet.add(m.trim()));
      }
      if (!srcAddr && f.SrcAddr) {
        srcAddr = f.SrcAddr;
      }
      if (!dstAddr && f.DstAddr) {
        dstAddr = f.DstAddr;
      }
      if (!srcPort && f.SrcPort) {
        srcPort = f.SrcPort;
      }
      if (!dstPort && f.DstPort) {
        dstPort = f.DstPort;
      }
      if (f.TimeFlowStartMs && f.TimeFlowStartMs < startTime) {
        startTime = f.TimeFlowStartMs;
      }
      if (f.TimeFlowEndMs && f.TimeFlowEndMs > endTime) {
        endTime = f.TimeFlowEndMs;
      }
      totalBytes += f.Bytes || 0;
      totalPackets += f.Packets || 0;

      if (f.RtpSsrc && f.RtpPayloadType) {
        const key = f.RtpSsrc;
        if (!rtpMap.has(key)) {
          rtpMap.set(key, {
            payloadType: f.RtpPayloadType,
            ssrc: f.RtpSsrc,
            bytes: f.Bytes || 0,
            packets: f.Packets || 0
          });
        } else {
          const existing = rtpMap.get(key)!;
          existing.bytes += f.Bytes || 0;
          existing.packets += f.Packets || 0;
        }
      }
    }

    const methods = Array.from(methodSet).join(',');
    calls.push({
      callIdHash: hash,
      methods,
      status: sipCallStatus(methods),
      flows,
      srcAddr,
      dstAddr,
      srcPort,
      dstPort,
      startTime: startTime === Infinity ? 0 : startTime,
      endTime,
      totalBytes,
      totalPackets,
      rtpStreams: Array.from(rtpMap.values())
    });
  });

  return calls.sort((a, b) => b.startTime - a.startTime);
};
