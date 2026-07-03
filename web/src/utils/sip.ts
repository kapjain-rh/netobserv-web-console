import { ReadOnlyValues } from './values';

export const sipMethods: ReadOnlyValues = [
  { value: 0x01, name: 'INVITE', description: 'Initiate a session' },
  { value: 0x02, name: 'ACK', description: 'Confirm session establishment' },
  { value: 0x04, name: 'BYE', description: 'Terminate a session' },
  { value: 0x08, name: 'CANCEL', description: 'Cancel a pending request' },
  { value: 0x10, name: 'REGISTER', description: 'Register contact information' },
  { value: 0x20, name: 'OPTIONS', description: 'Query server capabilities' },
  { value: 0x40, name: 'RESPONSE', description: 'SIP response message' }
] as const;

export const rtpPayloadTypes: ReadOnlyValues = [
  { value: 0, name: 'PCMU', description: 'G.711 u-law 8kHz' },
  { value: 3, name: 'GSM', description: 'GSM 8kHz' },
  { value: 4, name: 'G723', description: 'G.723.1' },
  { value: 8, name: 'PCMA', description: 'G.711 A-law 8kHz' },
  { value: 9, name: 'G722', description: 'G.722 16kHz' },
  { value: 18, name: 'G729', description: 'G.729 8kHz' },
  { value: 96, name: 'dynamic', description: 'Dynamic payload type' },
  { value: 111, name: 'opus', description: 'Opus codec' }
] as const;

export type SipCallStatus = 'completed' | 'in-progress' | 'cancelled' | 'registration';

export const sipCallStatus = (methods: string): SipCallStatus => {
  const parts = methods.split(',').map(s => s.trim());
  if (parts.includes('CANCEL')) {
    return 'cancelled';
  }
  if (parts.includes('REGISTER') && !parts.includes('INVITE')) {
    return 'registration';
  }
  if (parts.includes('INVITE') && parts.includes('BYE')) {
    return 'completed';
  }
  return 'in-progress';
};

export const getRtpPayloadDescription = (name: string): string => {
  return rtpPayloadTypes.find(v => v.name === name)?.description || name;
};

export const getSipMethodDescription = (name: string): string => {
  return sipMethods.find(v => v.name === name)?.description || name;
};
