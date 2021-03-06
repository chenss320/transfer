package gov.lbl.nest.spade.execute;

import gov.lbl.nest.jee.monitor.InstrumentationDB;
import gov.lbl.nest.jee.watching.WatcherDB;
import gov.lbl.nest.spade.ImplementationString;
import gov.lbl.nest.spade.SpadeCounts;
import gov.lbl.nest.spade.SpadeLoads;
import gov.lbl.nest.spade.common.MailSession;
import gov.lbl.nest.spade.common.SpadeDB;
import gov.lbl.nest.spade.common.WarehouseDB;
import gov.lbl.nest.spade.config.Assembly;
import gov.lbl.nest.spade.config.Configuration;
import gov.lbl.nest.spade.config.Deployment;
import gov.lbl.nest.spade.config.Neighborhood;
import gov.lbl.nest.spade.config.TransferDefinition;
import gov.lbl.nest.spade.services.CacheLoad;
import gov.lbl.nest.spade.services.NeighborhoodManager;
import gov.lbl.nest.spade.services.impl.NeighborhoodManagerImpl;
import gov.lbl.nest.spade.state.Application;
import gov.lbl.nest.spade.state.ApplicationCounts;
import gov.lbl.nest.spade.state.ApplicationLoads;
import gov.lbl.nest.tally.simple.SimpleMonitorFactory;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Collection;
import java.util.Properties;
import java.util.Set;

import javax.ejb.Singleton;
import javax.enterprise.inject.Produces;
import javax.mail.Authenticator;
import javax.mail.PasswordAuthentication;
import javax.mail.Session;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.xml.bind.JAXBException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * This class provides resources to be injected into the ingest application.
 * 
 * @author patton
 */
@Singleton
public class ResourcesForSpade {

    // public static final member data

    // protected static final member data

    // static final member data

    // private static final member data

    static {
        System.setProperty(SimpleMonitorFactory.class.getName() + ".load.interval",
                           "10");
        System.setProperty(SimpleMonitorFactory.class.getName() + ".rate.interval",
                           "3");
    }

    /**
     * The {@link Logger} used by this class.
     */
    private static final Logger LOG = LoggerFactory.getLogger(ResourcesForSpade.class);

    /**
     * The name of the property containing the email credentials.
     */
    private static final String MAIL_CREDENTIALS_PROPERTY = "mail.credentials";

    /**
     * The name of the property containing the email credentials.
     */
    public static final String MAIL_FROM_PROPERTY = "mail.from";

    /**
     * The name of the properties file contains the mail configuration.
     */
    private static final String MAIL_PROPERTIES = "mail.properties";

    /**
     * The name of the property containing the email credentials.
     */
    private static final String MAIL_USER_PROPERTY = "mail.user";

    // private static member data

    // private instance member data

    /**
     * Expose an entity manager using the resource producer pattern
     */
    @PersistenceContext(unitName = "spade")
    private EntityManager entityManager;

    /**
     * The {@link Configuration} containing this application's configuration
     * data.
     */
    private Configuration configuration;

    /**
     * The counts within this application.
     */
    private ApplicationCounts counts;

    /**
     * The loads within this application.
     */
    private ApplicationLoads loads;

    /**
     * The {@link NeighborhoodManager} managing the set of neighboring
     * applications.
     */
    private NeighborhoodManagerImpl neighborhood;

    /**
     * The {@link Session} to be used by the SPADE system.
     */
    private Session session;

    /**
     * The version String containing this project's release.
     */
    private static String version;

    // constructors

    /**
     * Creates an instance of this class.
     */
    public ResourcesForSpade() {
        getVersion();
    }

    // instance member method (alphabetic)

    /**
     * Returns the name of this application's {@link Assembly}.
     * 
     * @return the name of this application's {@link Assembly}.
     */
    private String getAssemblyName() {
        final Assembly assembly = getConfiguration().getAssembly();
        return assembly.getName();
    }

    /**
     * Returns the configuration for this application.
     * 
     * @return the configuration for this application.
     */
    @Produces
    public Configuration getConfiguration() {
        if (null == configuration) {
            try {
                configuration = Configuration.load();
                LOG.info("Read configuration for \"" + getAssemblyName()
                         + "\" from \""
                         + configuration.getFile()
                         + "\"");
            } catch (JAXBException e1) {
                LOG.error("Could not parse configuration file");
                e1.printStackTrace();
            }

        }
        return configuration;
    }

    /**
     * Returns the counts within this application.
     * 
     * @return the counts within this application.
     */
    @Produces
    @SpadeCounts
    public ApplicationCounts getCounts() {
        if (null == counts) {
            counts = new ApplicationCounts();
            final String mailUser = getSession().getProperty(MAIL_USER_PROPERTY);
            if (null == mailUser) {
                InetAddress localhost;
                try {
                    localhost = InetAddress.getLocalHost();
                    counts.setLocation(localhost.getHostName());
                } catch (UnknownHostException e) {
                    counts.setLocation("Unknown location");
                }
            } else {
                counts.setLocation(mailUser);
            }
            final Application application = new Application();
            final Assembly assembly = getConfiguration().getAssembly();
            application.setName(assembly.getName());
            if (getConfiguration().isSuspended()) {
                application.setState("SUSPENDED");
            } else {
                application.setState("RUNNING");
            }
            counts.setApplication(application);
        }
        return counts;
    }

    /**
     * Returns the {@link EntityManager} instance used by this application.
     * 
     * @return the {@link EntityManager} instance used by this application.
     */
    @Produces
    @InstrumentationDB
    @SpadeDB
    @WarehouseDB
    @WatcherDB
    public EntityManager getEntityManager() {
        return entityManager;
    }

    /**
     * Returns the implementation version.
     * 
     * @return the implementation version.
     */
    @Produces
    @ImplementationString
    public String getImplementationString() {
        getVersion();
        return version;
    }

    /**
     * Returns the loads within this application.
     * 
     * @return the loads within this application.
     */
    @Produces
    @SpadeLoads
    public ApplicationLoads getLoads() {
        if (null == loads) {
            loads = new ApplicationLoads();
            final Session session = getSession();
            loads.setLocation(session.getProperty(MAIL_USER_PROPERTY));
            final Application application = new Application();
            final Assembly assembly = getConfiguration().getAssembly();
            application.setName(assembly.getName());
            loads.setApplication(application);
            loads.setCacheLoad(new CacheLoad(getConfiguration().getCacheDefinition()));
        }
        return loads;
    }

    /**
     * Returns the {@link NeighborhoodManager} managing the data movement
     * network.
     * 
     * @return the {@link NeighborhoodManager} managing the data movement
     *         network.
     */
    @Produces
    public NeighborhoodManager getNeighborhood() {
        if (null == neighborhood) {
            final String mailName = getSession().getProperty(MAIL_FROM_PROPERTY);
            final String neighborhoodName;
            final Neighborhood locale = getConfiguration().getNeighborhood();
            if (null != locale) {
                final Deployment home = locale.getHome();
                if (null != home) {
                    neighborhoodName = home.getEmail();
                } else {
                    neighborhoodName = null;
                }
            } else {
                neighborhoodName = null;
            }
            if (null != mailName && null != neighborhoodName
                && !neighborhoodName.equals(mailName)) {
                final String message = "Mismatch in application email between neighborhood and mail declarations";
                LOG.error(message);
                throw new IllegalStateException(message);
            } else if (null == mailName) {
                neighborhood = new NeighborhoodManagerImpl(neighborhoodName);
            } else {
                neighborhood = new NeighborhoodManagerImpl(mailName);
            }
            for (TransferDefinition transfer : getConfiguration().getOutboundTransfers()) {
                neighborhood.addNeighbor(transfer.getNeighborEmail());
            }
            for (TransferDefinition transfer : getConfiguration().getInboundTransfers()) {
                neighborhood.addNeighbor(transfer.getNeighborEmail());
            }
            if (null != locale) {
                final Collection<String> neighbors = neighborhood.getNeighborhoodEmails();
                for (String neighbor : neighbors) {
                    neighborhood.setVerifyUrl(neighbor,
                                              locale.getVerifyUrl(neighbor));
                }
            }
            if (null == neighborhood.getHomeEmail() && !(neighborhood.getNeighborhoodEmails().isEmpty())) {
                final String message = "Running is standalone mode, but neighbors have been specified";
                LOG.error(message);
                throw new IllegalStateException(message);
            }
        }
        return neighborhood;
    }

    /**
     * Returns the {@link Session} to be used by the SPADE application.
     * 
     * @return the {@link Session} to be used by the SPADE application.
     */
    @Produces
    @MailSession
    public Session getSession() {
        if (null == session) {
            Properties props = new Properties();
            try {
                final String propertiesFile = getConfiguration().getMailProperties();
                final File fileToUse;
                if (null == propertiesFile) {
                    fileToUse = new File(getConfiguration().getDirectory(),
                                         MAIL_PROPERTIES);
                } else {
                    final File mailProperties = new File(propertiesFile);
                    if (mailProperties.isAbsolute()) {
                        fileToUse = mailProperties;
                    } else {
                        fileToUse = new File(getConfiguration().getDirectory(),
                                             mailProperties.getPath());
                    }
                }
                props.load(new FileInputStream(fileToUse));
                final String mailUser = props.getProperty(MAIL_USER_PROPERTY);
                final String mailPassword = props.getProperty(MAIL_CREDENTIALS_PROPERTY);
                session = Session.getInstance(props,
                                              new Authenticator() {
                                                  @Override
                                                  protected PasswordAuthentication getPasswordAuthentication() {
                                                      return new PasswordAuthentication(mailUser,
                                                                                        mailPassword);
                                                  }
                                              });
                LOG.info("Read mail properties for \"" + getAssemblyName()
                         + "\" from \""
                         + fileToUse.getPath()
                         + "\"");
            } catch (FileNotFoundException e) {
                session = Session.getInstance(new Properties());
            } catch (IOException e) {
                // TODO Auto-generated catch block
                e.printStackTrace();
            }
            final Set<String> names = props.stringPropertyNames();
            if (names.isEmpty()) {
                LOG.warn("No mail properties were specified for \"" + getAssemblyName()
                         + "\"");
            } else {
                LOG.info("The following mail properties were specified for \"" + getAssemblyName()
                         + "\"");
                for (String name : names) {
                    if (MAIL_CREDENTIALS_PROPERTY.equals(name)) {
                        LOG.info("  " + name
                                 + " = "
                                 + "<provided>");
                    } else {
                        LOG.info("  " + name
                                 + " = "
                                 + props.getProperty(name));
                    }
                }
            }

        }
        return session;
    }

    // static member methods (alphabetic)

    /**
     * Returns the version String containing this project's release.
     * 
     * @return the version String containing this project's release.
     */
    private static synchronized String getVersion() {
        if (null == version) {
            Properties props = new Properties();
            try {
                final InputStream is = ResourcesForSpade.class.getResourceAsStream("/META-INF/maven/gov.lbl.nest.spade/spade/pom.properties");
                if (null == is) {
                    LOG.warn("No version file found in WAR, probably not built with Maven");
                    version = "Unknown";
                    return version;
                }
                props.load(is);
                version = props.getProperty("version",
                                            "Unknown");
                LOG.info("Using version " + version
                         + " of artifact \""
                         + props.getProperty("groupId",
                                             "-")
                         + ":"
                         + props.getProperty("artifactId",
                                             "-")
                         + "\"");
            } catch (IOException e) {
                version = "Unknown";
                // TODO Auto-generated catch block
                e.printStackTrace();
            }
        }
        return version;
    }

    // Description of this object.
    // @Override
    // public String toString() {}

    // public static void main(String args[]) {}
}
