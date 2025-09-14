import type { StackProps } from 'aws-cdk-lib';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';
import type { DomainConfig } from './domain';

export interface CertStackProps extends StackProps {
  readonly domainConfig: DomainConfig;
}

export class CertStack extends Stack {
  public readonly certificate: Certificate;
  public readonly certificateArn: string;

  constructor(scope: Construct, id: string, props: CertStackProps) {
    super(scope, id, props);

    const { baseDomain, envName } = props.domainConfig;

    // Lookup existing hosted zone for the base domain
    const zone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName: baseDomain,
      privateZone: false,
    });

    // ACM certificate for apex + wildcard, validated via DNS
    this.certificate = new Certificate(this, 'WebAcmCertificate', {
      domainName: baseDomain,
      subjectAlternativeNames: [`*.${baseDomain}`],
      validation: CertificateValidation.fromDns(zone),
    });

    // Store ARN to SSM Parameter for cross-region consumers (optional; we also expose as a prop)
    const paramName = `/ayeldo/${envName}/web/certificateArn`;
    new StringParameter(this, 'WebCertArnParam', {
      parameterName: paramName,
      stringValue: this.certificate.certificateArn,
    });

    this.certificateArn = this.certificate.certificateArn;
    new CfnOutput(this, 'WebCertArn', { value: this.certificate.certificateArn });
    new CfnOutput(this, 'WebCertParamName', { value: paramName });
  }
}
