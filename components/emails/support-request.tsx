// app/emails/SupportRequest.tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
} from '@react-email/components';
import * as React from 'react';

interface SupportRequestEmailProps {
  messages: { role: string; content: string }[];
  contactInfo: {
    name: string;
    email: string;
    additionalInfo: string;
  };
}

export const SupportRequestEmail: React.FC<SupportRequestEmailProps> = ({ messages, contactInfo }) => (
  <Html>
    <Head />
    <Preview>New Support Request from Deltalytix</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Support Request</Heading>
        <Section style={section}>
          <Text style={sectionTitle}>Contact Information:</Text>
          <Text style={text}>Name: {contactInfo.name}</Text>
          <Text style={text}>Email: {contactInfo.email}</Text>
          <Text style={text}>Additional Info: {contactInfo.additionalInfo}</Text>
        </Section>
        <Section style={section}>
          <Text style={sectionTitle}>Conversation History:</Text>
          {messages.map((message, index) => (
            <Text key={index} style={message.role === 'user' ? userMessage : assistantMessage}>
              <strong>{message.role === 'user' ? 'User' : 'Assistant'}:</strong> {message.content}
            </Text>
          ))}
        </Section>
      </Container>
    </Body>
  </Html>
);

export default SupportRequestEmail;

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  padding: '17px 0 0',
  margin: '0',
};

const section = {
  margin: '20px 0',
};

const sectionTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 10px',
};

const text = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
};

const userMessage = {
  ...text,
  backgroundColor: '#f0f0f0',
  padding: '10px',
  borderRadius: '5px',
  marginBottom: '10px',
};

const assistantMessage = {
  ...text,
  backgroundColor: '#e6f3ff',
  padding: '10px',
  borderRadius: '5px',
  marginBottom: '10px',
};