import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Registra as fontes
Font.register({
  family: 'Inter',
  src: '/fonts/Inter-Regular.ttf',
});

Font.register({
  family: 'InterBold',
  src: '/fonts/Inter-Bold.ttf',
});

// Estilos do PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    padding: '60px 16mm 18mm 16mm',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 'auto',
  },
  headerText: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'Inter',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontFamily: 'InterBold',
    color: '#1a1a1a',
  },
  section: {
    margin: 10,
    padding: 10,
  },
  content: {
    fontSize: 12,
    lineHeight: 1.5,
    fontFamily: 'Inter',
    color: '#333',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#666',
    marginRight: 8,
  },
  checkedBox: {
    backgroundColor: '#4CAF50',
    borderWidth: 0,
  },
  timestamp: {
    fontSize: 10,
    color: '#666',
    marginLeft: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
    color: '#666',
  },
  // Estilos específicos para análises
  analysisSection: {
    marginBottom: 15,
  },
  analysisTitle: {
    fontSize: 18,
    fontFamily: 'InterBold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  analysisSubtitle: {
    fontSize: 14,
    fontFamily: 'InterBold',
    color: '#333',
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 12,
    lineHeight: 1.6,
    marginBottom: 10,
  },
  highlight: {
    backgroundColor: '#fff3cd',
    padding: '4 8',
    borderRadius: 4,
  },
  alert: {
    backgroundColor: '#f8d7da',
    padding: '4 8',
    borderRadius: 4,
  },
  success: {
    backgroundColor: '#d4edda',
    padding: '4 8',
    borderRadius: 4,
  },
  metadata: {
    fontSize: 10,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
});

interface ChecklistItem {
  text: string;
  checked?: boolean;
  timestamp?: Date;
}

interface AnalysisSection {
  title: string;
  content: string;
  type?: 'highlight' | 'alert' | 'success';
  metadata?: {
    date?: Date;
    author?: string;
    category?: string;
  };
}

interface Section {
  title: string;
  items?: ChecklistItem[];
  analysisContent?: AnalysisSection[];
}

interface PDFDocumentProps {
  type: 'checklist' | 'analysis';
  content: {
    title: string;
    sections: Array<{
      title: string;
      items?: ChecklistItem[];
      analysisContent?: AnalysisSection[];
    }>;
  };
  clientName: string;
  logoUrl: string;
}

const RenderChecklist: React.FC<{ section: Section }> = ({ section }) => (
  <View style={styles.section}>
    <Text style={[styles.content, { fontFamily: 'InterBold', marginBottom: 10 }]}>
      {section.title}
    </Text>
    
    {section.items?.map((item: ChecklistItem, iIndex: number) => (
      <View key={iIndex} style={styles.checklistItem}>
        <View style={[styles.checkbox, item.checked ? styles.checkedBox : {}]} />
        <Text style={styles.content}>{item.text}</Text>
        {item.timestamp && (
          <Text style={styles.timestamp}>
            {format(new Date(item.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </Text>
        )}
      </View>
    ))}
  </View>
);

const RenderAnalysis: React.FC<{ section: Section }> = ({ section }) => (
  <View style={styles.analysisSection}>
    <Text style={styles.analysisTitle}>{section.title}</Text>
    
    {section.analysisContent?.map((content: AnalysisSection, index: number) => (
      <View key={index} style={styles.section}>
        <Text style={styles.analysisSubtitle}>{content.title}</Text>
        <View style={content.type ? styles[content.type] : {}}>
          <Text style={styles.analysisText}>{content.content}</Text>
        </View>
        
        {content.metadata && (
          <Text style={styles.metadata}>
            {[
              content.metadata.date && format(new Date(content.metadata.date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
              content.metadata.author && `Autor: ${content.metadata.author}`,
              content.metadata.category && `Categoria: ${content.metadata.category}`
            ].filter(Boolean).join(' • ')}
          </Text>
        )}
      </View>
    ))}
  </View>
);

export const PDFDocument: React.FC<PDFDocumentProps> = ({ type, content, clientName, logoUrl }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image style={styles.logo} src={logoUrl} />
        <Text style={styles.headerText}>
          {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </Text>
      </View>

      <Text style={styles.title}>{content.title}</Text>

      {content.sections.map((section: Section, sIndex: number) => (
        <View key={sIndex}>
          {type === 'checklist' ? (
            <RenderChecklist section={section} />
          ) : (
            <RenderAnalysis section={section} />
          )}
        </View>
      ))}

      <Text style={styles.footer}>
        {type === 'checklist' ? 'Checklist' : 'Análise'} gerado para {clientName} • {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
      </Text>
    </Page>
  </Document>
);

export default PDFDocument; 